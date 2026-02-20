import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video, VideoStatus } from './entities/video.entity';
import { Chapter } from './entities/chapter.entity';
import { Quiz } from './entities/quiz.entity';
import { VideoAnalytics } from './entities/video-analytics.entity';
import { TranscodingService } from './transcoding.service';
import { FilesService } from '../files/files.service';
import { v4 as uuid } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import type { File } from 'multer';

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    @InjectRepository(Video)
    private readonly videoRepo: Repository<Video>,
    @InjectRepository(Chapter)
    private readonly chapterRepo: Repository<Chapter>,
    @InjectRepository(Quiz)
    private readonly quizRepo: Repository<Quiz>,
    @InjectRepository(VideoAnalytics)
    private readonly analyticsRepo: Repository<VideoAnalytics>,
    private readonly transcodingService: TranscodingService,
    private readonly filesService: FilesService,
  ) {}

  async create(file: File, ownerId: string, title: string, description?: string) {
    // 1. Upload original file via FilesService (optional, or just save temporarily)
    // For now, we upload it to ensure we have a backup and can access it.
    // However, for transcoding we need a local path usually, or a signed URL if ffmpeg supports it.
    // FilesService uploads to S3/Storage.

    // We will save to a temp file for transcoding first.
    const tempInputPath = path.join(os.tmpdir(), `${uuid()}-${file.originalname}`);
    await fs.promises.writeFile(tempInputPath, file.buffer);

    const videoId = uuid();
    const video = this.videoRepo.create({
      id: videoId,
      title,
      description,
      ownerId,
      status: VideoStatus.PROCESSING,
    });
    await this.videoRepo.save(video);

    // Trigger processing in background
    this.processVideo(videoId, tempInputPath, ownerId);

    return video;
  }

  async addChapter(videoId: string, createChapterDto: any) {
    const chapter = this.chapterRepo.create({ ...createChapterDto, videoId });
    return this.chapterRepo.save(chapter);
  }

  async addQuiz(videoId: string, createQuizDto: any) {
    const quiz = this.quizRepo.create({ ...createQuizDto, videoId });
    return this.quizRepo.save(quiz);
  }

  async trackProgress(videoId: string, userId: string, progressDto: any) {
    let analytics = await this.analyticsRepo.findOne({ where: { videoId, userId } });
    if (!analytics) {
      analytics = this.analyticsRepo.create({ videoId, userId });
    }
    analytics.watchTime = progressDto.watchTime;
    analytics.lastPosition = progressDto.lastPosition;
    analytics.completed = progressDto.completed;
    return this.analyticsRepo.save(analytics);
  }

  async findOne(id: string) {
    const video = await this.videoRepo.findOne({
      where: { id },
      relations: ['chapters', 'quizzes'],
    });
    if (!video) throw new NotFoundException(`Video with ID ${id} not found`);
    return video;
  }

  private async processVideo(videoId: string, inputPath: string, ownerId: string) {
    try {
      const outputDir = `videos/${videoId}/hls`;
      const manifestPath = await this.transcodingService.transcodeToHls(inputPath, outputDir);

      await this.videoRepo.update(videoId, {
        status: VideoStatus.READY,
        hlsManifestPath: manifestPath,
        // duration: ... // could be parsed from ffmpeg metadata
      });
    } catch (e) {
      this.logger.error(`Video processing failed for ${videoId}`, e);
      await this.videoRepo.update(videoId, { status: VideoStatus.FAILED });
    } finally {
      // Cleanup temp input
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
  }
}
