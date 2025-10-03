import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video, VideoStatus } from '../video-streaming/entities/video.entity';
import { S3Service } from './s3.service';

@Injectable()
export class MediaService {
  constructor(
    @InjectQueue('transcode') private readonly transcodeQueue: Queue,
    @InjectRepository(Video) private readonly videoRepository: Repository<Video>,
    private readonly s3Service: S3Service,
  ) {}

  async startTranscoding(file: Express.Multer.File) {
    const video = this.videoRepository.create({
      originalFilename: file.originalname,
      fileSize: file.size,
      status: VideoStatus.UPLOADING,
      title: file.originalname,
    });
    await this.videoRepository.save(video);

    await this.transcodeQueue.add('transcode', {
      file: file.path,
      videoId: video.id,
    });

    return { message: 'File uploaded and transcoding started.', videoId: video.id };
  }

  async getSignedUrl(videoId: string, key: string) {
    const video = await this.videoRepository.findOneBy({ id: videoId });
    if (!video) {
      throw new Error('Video not found');
    }
    return this.s3Service.getSignedUrl(key);
  }

  async getVideoStatus(videoId: string) {
    const video = await this.videoRepository.findOneBy({ id: videoId });
    if (!video) {
      throw new Error('Video not found');
    }
    return { status: video.status };
  }
}
