import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { CourseAnalyticsService } from './services/course-analytics.service';
import { ProgressTrackingService } from './services/progress-tracking.service';

@Processor('analytics')
export class AnalyticsProcessor {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(
    private progressTrackingService: ProgressTrackingService,
    // CourseAnalyticsService owns cache invalidation — not the report-based AnalyticsService
    private courseAnalyticsService: CourseAnalyticsService,
  ) {}

  @Process('update-streak')
  async handleStreakUpdate(job: Job<{ userId: string }>): Promise<void> {
    await this.progressTrackingService.updateStreak(job.data.userId);
  }

  @Process('check-at-risk')
  async handleAtRiskCheck(job: Job<{ userId: string; courseId: string }>): Promise<void> {
    const { userId, courseId } = job.data;
    await this.progressTrackingService.computeAtRisk(userId, courseId);
    await this.courseAnalyticsService.invalidateStudentCache(userId);
    await this.courseAnalyticsService.invalidateCourseCache(courseId);
  }

  @Process('rebuild-course-cache')
  async handleRebuildCourseCache(job: Job<{ courseId: string }>): Promise<void> {
    await this.courseAnalyticsService.invalidateCourseCache(job.data.courseId);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Analytics job ${job.id} (${job.name}) failed: ${error.message}`);
  }
}
