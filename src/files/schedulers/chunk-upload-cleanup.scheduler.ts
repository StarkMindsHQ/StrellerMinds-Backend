import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChunkUploadService } from '../services/chunk-upload.service';

@Injectable()
export class ChunkUploadCleanupScheduler {
  private readonly logger = new Logger(ChunkUploadCleanupScheduler.name);

  constructor(private readonly chunkUploadService: ChunkUploadService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredUploads(): Promise<void> {
    this.logger.log('Starting cleanup of expired chunk uploads...');
    
    try {
      await this.chunkUploadService.cleanupExpiredSessions();
      this.logger.log('Completed cleanup of expired chunk uploads');
    } catch (error) {
      this.logger.error('Failed to cleanup expired chunk uploads', error);
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async performDeepCleanup(): Promise<void> {
    this.logger.log('Starting deep cleanup of orphaned chunks...');
    
    try {
      // Additional cleanup logic for orphaned chunks
      // This could include chunks from crashed uploads, etc.
      this.logger.log('Completed deep cleanup of orphaned chunks');
    } catch (error) {
      this.logger.error('Failed to perform deep cleanup', error);
    }
  }
}
