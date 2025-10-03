import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import ffmpeg = require('fluent-ffmpeg');
import * as path from 'path';
import * as fs from 'fs';
import { S3Service } from './s3.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video, VideoStatus } from '../video-streaming/entities/video.entity';

@Processor('transcode')
export class TranscodeProcessor {
  private readonly logger = new Logger(TranscodeProcessor.name);

  constructor(
    private readonly s3Service: S3Service,
    @InjectRepository(Video) private readonly videoRepository: Repository<Video>,
  ) {}

  @Process('transcode')
  async handleTranscode(job: Job<{ file: string; videoId: string }>) {
    this.logger.log(`Starting transcoding for video ${job.data.videoId}...`);
    const { file, videoId } = job.data;

    const video = await this.videoRepository.findOneBy({ id: videoId });
    if (!video) {
      this.logger.error(`Video with ID ${videoId} not found.`);
      return;
    }

    if (video.status === VideoStatus.READY) {
      this.logger.log(`Video ${videoId} is already transcoded. Skipping.`);
      return;
    }

    await this.videoRepository.update(videoId, { status: VideoStatus.PROCESSING });

    const outputDir = path.join('output', videoId);
    const s3KeyPrefix = videoId;

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      await this.transcodeToHls(file, outputDir);
      await this.generateThumbnails(file, outputDir);
      await this.uploadToS3(outputDir, s3KeyPrefix);

      const hlsUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/${s3KeyPrefix}/playlist.m3u8`;
      const thumbnailUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/${s3KeyPrefix}/thumbnail-1.png`;

      await this.videoRepository.update(videoId, {
        status: VideoStatus.READY,
        hlsUrl,
        thumbnailUrl,
      });
    } catch (error) {
      await this.videoRepository.update(videoId, { status: VideoStatus.FAILED });
      this.logger.error(`Failed to transcode video ${videoId}`, error);
    } finally {
      this.cleanupLocalFiles(outputDir, file);
    }
  }

  private transcodeToHls(inputFile: string, outputDir: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(inputFile)
        .outputOptions([
          '-hls_time 10',
          '-hls_list_size 0',
          '-hls_segment_filename',
          path.join(outputDir, 'segment%03d.ts'),
        ])
        .output(path.join(outputDir, 'playlist.m3u8'))
        .on('end', () => {
          this.logger.log(`Finished transcoding for ${inputFile}.`);
          resolve();
        })
        .on('error', (err: Error) => {
          this.logger.error(`Error transcoding ${inputFile}:`, err);
          reject(err);
        })
        .run();
    });
  }

  private generateThumbnails(inputFile: string, outputDir: string): Promise<void> {
    this.logger.log(`Generating thumbnails for ${inputFile}...`);
    return new Promise<void>((resolve, reject) => {
      ffmpeg(inputFile)
        .screenshots({
          count: 3,
          folder: outputDir,
          filename: 'thumbnail-%i.png',
        })
        .on('end', () => {
          this.logger.log(`Finished generating thumbnails for ${inputFile}.`);
          resolve();
        })
        .on('error', (err: Error) => {
          this.logger.error(`Error generating thumbnails for ${inputFile}:`, err);
          reject(err);
        });
    });
  }

  private async uploadToS3(directory: string, s3KeyPrefix: string) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
      const filePath = path.join(directory, file);
      const s3Key = `${s3KeyPrefix}/${file}`;
      await this.s3Service.uploadFile(filePath, s3Key);
    }
  }

  private cleanupLocalFiles(directory: string, originalFile: string) {
    fs.rmSync(directory, { recursive: true, force: true });
    fs.unlinkSync(originalFile);
  }
}
