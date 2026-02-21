import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AnalyticsController } from './controllers/analytics.controller';
import { ReportBuilderController } from './controllers/report-builder.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { ScheduleController } from './controllers/schedule.controller';
import { AnalyticsService } from './services/analytics.service';
import { ReportBuilderService } from './services/report-builder.service';
import { DataAggregationService } from './services/data-aggregation.service';
import { ReportGenerationService } from './services/report-generation.service';
import { PredictiveAnalyticsService } from './services/predictive-analytics.service';
import { DataExportService } from './services/data-export.service';
import { VisualizationService } from './services/visualization.service';
import { AnalyticsReport } from './entities/analytics-report.entity';
import { ReportSchedule } from './entities/report-schedule.entity';
import { DataSnapshot } from './entities/data-snapshot.entity';
import { AnalyticsCache } from './entities/analytics-cache.entity';
import { ProfileAnalytics } from '../user/entities/profile-analytics.entity';
import { FinancialReport } from '../payment/entities/financial-report.entity';
import { UserActivity } from '../user/entities/user-activity.entity';
import { Payment } from '../payment/entities/payment.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnalyticsReport,
      ReportSchedule,
      DataSnapshot,
      AnalyticsCache,
      ProfileAnalytics,
      FinancialReport,
      UserActivity,
      Payment,
      User,
    ]),
    CacheModule.register({
      ttl: 300, // 5 minutes default
      max: 100,
    }),
  ],
  controllers: [
    AnalyticsController,
    ReportBuilderController,
    DashboardController,
    ScheduleController,
  ],
  providers: [
    AnalyticsService,
    ReportBuilderService,
    DataAggregationService,
    ReportGenerationService,
    PredictiveAnalyticsService,
    DataExportService,
    VisualizationService,
  ],
  exports: [AnalyticsService, DataAggregationService],
})
export class AnalyticsModule {}
