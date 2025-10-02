import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import { Video, VideoStatus } from '../entities/video.entity';
import { VideoQuality, QualityLevel } from '../entities/video-quality.entity';
import { AwsCloudFrontService } from './aws-cloudfront.service';

export interface ProcessingJob {
  videoId: string;
  inputPath: string;
  outputDir: string;
  settings: ProcessingSettings;
}

export interface ProcessingSettings {
  generateThumbnails: boolean;
  thumbnailCount: number;
  generatePreview: boolean;
  adaptiveStreaming: boolean;
  qualityLevels: QualityLevel[];
  watermark?: {
    enabled: boolean;
    url?: string;
    position?: string;
    opacity?: number;
  };
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
  codec: string;
  audioCodec: string;
  fileSize: number;
}

@Injectable()
export class VideoProcessingService {
  private readonly logger = new Logger(VideoProcessingService.name);
  private readonly tempDir = path.join(process.cwd(), 'temp', 'video-processing');

  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(VideoQuality)
    private readonly qualityRepository: Repository<VideoQuality>,
    @InjectQueue('video-processing')
    private readonly processingQueue: Queue,
    private readonly cloudFrontService: AwsCloudFrontService,
  ) {
    this.ensureTempDirectory();
  }

  private ensureTempDirectory(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async queueVideoProcessing(
    videoId: string,
    inputPath: string,
    settings: ProcessingSettings,
  ): Promise<void> {
    try {
      this.logger.debug(`Queueing video processing for video: ${videoId}`);

      await this.processingQueue.add(
        'process-video',
        {
          videoId,
          inputPath,
          outputDir: path.join(this.tempDir, videoId),
          settings,
        } as ProcessingJob,
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 5,
          removeOnFail: 10,
        },
      );

      // Update video status
      await this.videoRepository.update(videoId, {
        status: VideoStatus.PROCESSING,
        metadata: {
          processingStartedAt: new Date(),
        },
      });

      this.logger.debug(`Video processing queued successfully: ${videoId}`);
    } catch (error) {
      this.logger.error(`Failed to queue video processing: ${videoId}`, error.stack);
      throw error;
    }
  }

  async processVideo(job: ProcessingJob): Promise<void> {
    const { videoId, inputPath, outputDir, settings } = job;

    try {
      this.logger.log(`Starting video processing: ${videoId}`);

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Extract video metadata
      const metadata = await this.extractVideoMetadata(inputPath);

      // Update video with metadata
      await this.updateVideoMetadata(videoId, metadata);

      // Generate thumbnails
      if (settings.generateThumbnails) {
        await this.generateThumbnails(videoId, inputPath, outputDir, settings.thumbnailCount);
      }

      // Generate preview GIF
      if (settings.generatePreview) {
        await this.generatePreviewGif(videoId, inputPath, outputDir);
      }

      // Process quality variants
      if (settings.adaptiveStreaming) {
        await this.generateAdaptiveStreaming(videoId, inputPath, outputDir, settings);
      } else {
        await this.generateQualityVariants(videoId, inputPath, outputDir, settings.qualityLevels);
      }

      // Update video status
      await this.videoRepository.update(videoId, {
        status: VideoStatus.READY,
        metadata: {
          processingCompletedAt: new Date(),
          qualityVariants: settings.qualityLevels,
        },
      });

      // Cleanup temporary files
      await this.cleanupTempFiles(outputDir);

      this.logger.log(`Video processing completed: ${videoId}`);
    } catch (error) {
      this.logger.error(`Video processing failed: ${videoId}`, error.stack);

      await this.videoRepository.update(videoId, {
        status: VideoStatus.FAILED,
        metadata: {
          processingErrors: [error.message],
        },
      });

      throw error;
    }
  }

  async extractVideoMetadata(inputPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
        const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');

        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        const stats = fs.statSync(inputPath);

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          frameRate: this.parseFrameRate(videoStream.r_frame_rate),
          bitrate: parseInt(metadata.format.bit_rate) || 0,
          codec: videoStream.codec_name || '',
          audioCodec: audioStream?.codec_name || '',
          fileSize: stats.size,
        });
      });
    });
  }

  private parseFrameRate(frameRateString: string): number {
    if (!frameRateString) return 0;

    const parts = frameRateString.split('/');
    if (parts.length === 2) {
      return parseFloat(parts[0]) / parseFloat(parts[1]);
    }
    return parseFloat(frameRateString);
  }

  async generateThumbnails(
    videoId: string,
    inputPath: string,
    outputDir: string,
    count: number = 5,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const thumbnailDir = path.join(outputDir, 'thumbnails');
      if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
      }

      ffmpeg(inputPath)
        .screenshots({
          count,
          folder: thumbnailDir,
          filename: 'thumb_%03d.jpg',
          size: '320x240',
        })
        .on('end', async () => {
          try {
            // Upload thumbnails to CloudFront
            const thumbnailFiles = fs.readdirSync(thumbnailDir);
            const uploadPromises = thumbnailFiles.map(async (file, index) => {
              const filePath = path.join(thumbnailDir, file);
              const buffer = fs.readFileSync(filePath);
              const key = this.cloudFrontService.generateThumbnailKey(videoId, index);

              return this.cloudFrontService.uploadVideo(buffer, key, 'image/jpeg');
            });

            await Promise.all(uploadPromises);

            // Update video with first thumbnail URL
            if (thumbnailFiles.length > 0) {
              const firstThumbnailKey = this.cloudFrontService.generateThumbnailKey(videoId, 0);
              const thumbnailUrl = `https://${this.cloudFrontService['config'].distributionDomain}/${firstThumbnailKey}`;

              await this.videoRepository.update(videoId, {
                thumbnailUrl,
              });
            }

            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  async generatePreviewGif(videoId: string, inputPath: string, outputDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const previewPath = path.join(outputDir, 'preview.gif');

      ffmpeg(inputPath)
        .seekInput(10) // Start at 10 seconds
        .duration(5) // 5 seconds duration
        .size('320x240')
        .fps(10)
        .format('gif')
        .output(previewPath)
        .on('end', async () => {
          try {
            // Upload preview to CloudFront
            const buffer = fs.readFileSync(previewPath);
            const key = `videos/${videoId}/preview.gif`;
            const result = await this.cloudFrontService.uploadVideo(buffer, key, 'image/gif');

            // Update video with preview URL
            await this.videoRepository.update(videoId, {
              previewUrl: result.cdnUrl,
            });

            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject)
        .run();
    });
  }

  async generateQualityVariants(
    videoId: string,
    inputPath: string,
    outputDir: string,
    qualityLevels: QualityLevel[],
  ): Promise<void> {
    const qualitySettings = this.getQualitySettings();

    for (const quality of qualityLevels) {
      const settings = qualitySettings[quality];
      if (!settings) continue;

      await this.transcodeVideo(videoId, inputPath, outputDir, quality, settings);
    }
  }

  private async transcodeVideo(
    videoId: string,
    inputPath: string,
    outputDir: string,
    quality: QualityLevel,
    settings: any,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(outputDir, `${quality}.mp4`);

      let command = ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(settings.videoBitrate)
        .audioBitrate(settings.audioBitrate)
        .size(settings.resolution)
        .fps(settings.fps)
        .format('mp4')
        .outputOptions(['-preset fast', '-crf 23', '-movflags +faststart']);

      // Add watermark if enabled
      // if (watermark?.enabled && watermark.url) {
      //   command = command.complexFilter([
      //     `[0:v][1:v] overlay=${watermark.position}:enable='between(t,0,${duration})'`
      //   ]);
      // }

      command
        .output(outputPath)
        .on('end', async () => {
          try {
            // Upload to CloudFront
            const buffer = fs.readFileSync(outputPath);
            const key = this.cloudFrontService.generateVideoKey(videoId, quality);
            const result = await this.cloudFrontService.uploadVideo(buffer, key);

            // Save quality variant to database
            const qualityVariant = this.qualityRepository.create({
              video: { id: videoId },
              quality,
              width: settings.width,
              height: settings.height,
              bitrate: settings.videoBitrate,
              audioBitrate: settings.audioBitrate,
              frameRate: settings.fps,
              codec: 'h264',
              audioCodec: 'aac',
              container: 'mp4',
              fileSize: buffer.length,
              url: result.cdnUrl,
              s3Key: result.key,
              status: 'completed',
            });

            await this.qualityRepository.save(qualityVariant);

            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject)
        .run();
    });
  }

  private getQualitySettings() {
    return {
      [QualityLevel.LOW]: {
        resolution: '426x240',
        width: 426,
        height: 240,
        videoBitrate: 400,
        audioBitrate: 64,
        fps: 24,
      },
      [QualityLevel.MEDIUM]: {
        resolution: '640x360',
        width: 640,
        height: 360,
        videoBitrate: 800,
        audioBitrate: 96,
        fps: 30,
      },
      [QualityLevel.STANDARD]: {
        resolution: '854x480',
        width: 854,
        height: 480,
        videoBitrate: 1200,
        audioBitrate: 128,
        fps: 30,
      },
      [QualityLevel.HIGH]: {
        resolution: '1280x720',
        width: 1280,
        height: 720,
        videoBitrate: 2500,
        audioBitrate: 128,
        fps: 30,
      },
      [QualityLevel.FULL_HD]: {
        resolution: '1920x1080',
        width: 1920,
        height: 1080,
        videoBitrate: 5000,
        audioBitrate: 192,
        fps: 30,
      },
    };
  }

  async generateAdaptiveStreaming(
    videoId: string,
    inputPath: string,
    outputDir: string,
    settings: ProcessingSettings,
  ): Promise<void> {
    // Generate HLS manifest
    await this.generateHLSManifest(videoId, inputPath, outputDir, settings.qualityLevels);

    // Generate DASH manifest
    await this.generateDASHManifest(videoId, inputPath, outputDir, settings.qualityLevels);
  }

  private async generateHLSManifest(
    videoId: string,
    inputPath: string,
    outputDir: string,
    qualityLevels: QualityLevel[],
  ): Promise<void> {
    // Implementation for HLS manifest generation
    // This would create .m3u8 files and segment the video
    this.logger.debug(`Generating HLS manifest for video: ${videoId}`);
  }

  private async generateDASHManifest(
    videoId: string,
    inputPath: string,
    outputDir: string,
    qualityLevels: QualityLevel[],
  ): Promise<void> {
    // Implementation for DASH manifest generation
    // This would create .mpd files and segment the video
    this.logger.debug(`Generating DASH manifest for video: ${videoId}`);
  }

  private async updateVideoMetadata(videoId: string, metadata: VideoMetadata): Promise<void> {
    await this.videoRepository.update(videoId, {
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      frameRate: metadata.frameRate,
      bitrate: metadata.bitrate,
      codec: metadata.codec,
      audioCodec: metadata.audioCodec,
      fileSize: metadata.fileSize,
    });
  }

  private async cleanupTempFiles(outputDir: string): Promise<void> {
    try {
      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup temp files: ${outputDir}`, error.message);
    }
  }
}
