import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { EngagementEvent } from './entities/engagement-event.entity';
import { AnalyticsAggregation } from './entities/analytics-aggregation.entity';
import { AtRiskPrediction } from './entities/at-risk-prediction.entity';

// Existing services
import { CourseAnalyticsService } from './services/course-analytics.service';
import { AnalyticsExportService } from './services/analytics-export.service';
import { ProgressTrackingService } from './services/progress-tracking.service';
import { VisualizationService } from './services/visualization.service';
import { PredictiveAnalyticsService } from './services/predictive-analytics.service';

// New BI services
import { BusinessMetricsService } from './services/business-metrics.service';
import { CustomDashboardService } from './services/custom-dashboard.service';
import { AdvancedPredictiveService } from './services/advanced-predictive.service';
import { AnalyticsReportingService } from './services/analytics-reporting.service';

// Controllers
import { AnalyticsController } from './controllers/analytics.controller';
import { BIController } from './controllers/bi-controller';

import { StudentProgress } from './entities/student.progress.entity';
import { AnalyticsProcessor } from './analytics.processor';
import { QueueModule } from '../common/queue/queue.module';

/**
 * Analytics Module
 * Provides comprehensive analytics and business intelligence capabilities
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentProgress,
      EngagementEvent,
      AnalyticsAggregation,
      AtRiskPrediction,
    ]),

    QueueModule,
    ScheduleModule.forRoot(),
  ],

  providers: [
    // Existing services
    CourseAnalyticsService,
    AnalyticsExportService,
    AnalyticsProcessor,
    ProgressTrackingService,
    VisualizationService,
    PredictiveAnalyticsService,
    // New BI services
    BusinessMetricsService,
    CustomDashboardService,
    AdvancedPredictiveService,
    AnalyticsReportingService,
  ],

  controllers: [AnalyticsController, BIController],

  exports: [
    CourseAnalyticsService,
    ProgressTrackingService,
    AnalyticsExportService,
    BusinessMetricsService,
    CustomDashboardService,
    AdvancedPredictiveService,
    AnalyticsReportingService,
  ],
})
export class AnalyticsModule {}
