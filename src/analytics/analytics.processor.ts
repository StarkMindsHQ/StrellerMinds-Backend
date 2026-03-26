import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { CourseAnalyticsService } from './services/course-analytics.service';
import { ProgressTrackingService } from './services/progress-tracking.service';
import {
  BaseQueueProcessor,
  OrderedJobData,
} from '../common/queue/processors/base-queue.processor';
import { DeadLetterQueueService } from '../common/queue/services/dead-letter-queue.service';

interface AnalyticsJobData extends OrderedJobData {
  userId?: string;
  courseId?: string;
}

@Processor('analytics')
export class AnalyticsProcessor extends BaseQueueProcessor {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(
    private progressTrackingService: ProgressTrackingService,
    // CourseAnalyticsService owns cache invalidation — not the report-based AnalyticsService
    private courseAnalyticsService: CourseAnalyticsService,
    dlqService: DeadLetterQueueService,
  ) {
    super(null, dlqService); // Pass null for queue since we inject it in the base
  }

  @Process('update-streak')
  async handleStreakUpdate(job: Job<AnalyticsJobData>): Promise<void> {
    return this.processJobWithOrdering(job, async (data) => {
      await this.progressTrackingService.updateStreak(data.userId);
    });
  }

  @Process('check-at-risk')
  async handleAtRiskCheck(job: Job<AnalyticsJobData>): Promise<void> {
    return this.processJobWithOrdering(job, async (data) => {
      const { userId, courseId } = data;
      await this.progressTrackingService.computeAtRisk(userId, courseId);
      await this.courseAnalyticsService.invalidateStudentCache(userId);
      await this.courseAnalyticsService.invalidateCourseCache(courseId);
    });
  }

  @Process('rebuild-course-cache')
  async handleRebuildCourseCache(job: Job<AnalyticsJobData>): Promise<void> {
    return this.processJobWithOrdering(job, async (data) => {
      await this.courseAnalyticsService.invalidateCourseCache(data.courseId);
    });
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Analytics job ${job.id} (${job.name}) failed: ${error.message}`);
    // Base processor handles DLQ movement
  }
}
