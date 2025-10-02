import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { VideoProcessingService, ProcessingJob } from '../services/video-processing.service';

@Processor('video-processing')
export class VideoProcessingProcessor {
  private readonly logger = new Logger(VideoProcessingProcessor.name);

  constructor(private readonly processingService: VideoProcessingService) {}

  @Process('process-video')
  async handleVideoProcessing(job: Job<ProcessingJob>): Promise<void> {
    this.logger.log(`Starting video processing job ${job.id} for video ${job.data.videoId}`);

    try {
      await this.processingService.processVideo(job.data);
      this.logger.log(`Video processing completed for job ${job.id}`);
    } catch (error) {
      this.logger.error(`Video processing failed for job ${job.id}`, error.stack);
      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job<ProcessingJob>) {
    this.logger.log(`Processing job ${job.id} started for video ${job.data.videoId}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<ProcessingJob>) {
    this.logger.log(`Processing job ${job.id} completed for video ${job.data.videoId}`);
  }

  @OnQueueFailed()
  onFailed(job: Job<ProcessingJob>, err: Error) {
    this.logger.error(`Processing job ${job.id} failed for video ${job.data.videoId}`, err.stack);
  }
}
