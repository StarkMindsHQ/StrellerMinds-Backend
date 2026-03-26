import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { EngagementEvent } from './entities/engagement-event.entity';
import { AnalyticsAggregation } from './entities/analytics-aggregation.entity';
import { AtRiskPrediction } from './entities/at-risk-prediction.entity';

// Your existing report-based service — NOT replaced, just co-existing
// import { AnalyticsService } from './services/analytics.service';  ← keep registering this in your existing module

// New course/student analytics service with a distinct name
import { CourseAnalyticsService } from './services/course-analytics.service';
import { AnalyticsExportService } from './services/analytics-export.service';
import { ProgressTrackingService } from './services/progress-tracking.service';

import { AnalyticsController } from './controllers/analytics.controller';
import { StudentProgress } from './entities/student.progress.entity';
import { AnalyticsProcessor } from './analytics.processor';
import { QueueModule } from '../common/queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentProgress,
      EngagementEvent,
      AnalyticsAggregation,
      AtRiskPrediction,
    ]),

    QueueModule, // Import the centralized queue module
    ScheduleModule.forRoot(),
  ],

  providers: [
    CourseAnalyticsService,
    AnalyticsExportService,
    AnalyticsProcessor,
    ProgressTrackingService,
  ],

  controllers: [AnalyticsController],

  exports: [CourseAnalyticsService, ProgressTrackingService, AnalyticsExportService],
})
export class AnalyticsModule {}
