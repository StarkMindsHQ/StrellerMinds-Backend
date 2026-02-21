import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { EngagementEvent } from './entities/engagement-event.entity';
import { AnalyticsAggregation } from './entities/analytics-aggregation.entity';
import { AtRiskPrediction } from './entities/at-risk-prediction.entity';

// Your existing report-based service — NOT replaced, just co-existing
// import { AnalyticsService } from './services/analytics.service';  ← keep registering this in your existing module

// New course/student analytics service with a distinct name
import { CourseAnalyticsService } from './services/course-analytics.service';
import { AnalyticsExportService } from './services/analytics-export.service';
import { ProgressTrackingService } from '../learning-path/services/progress-tracking.service';

import { AnalyticsController } from './controllers/analytics.controller';
import { StudentProgress } from './entities/student.progress.entity';
import { AnalyticsProcessor } from './analytics.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentProgress,
      EngagementEvent,
      AnalyticsAggregation,
      AtRiskPrediction,
    ]),

    BullModule.registerQueueAsync({
      name: 'analytics',
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      }),
      inject: [ConfigService],
    }),

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
