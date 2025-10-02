import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

import { AnalyticsController } from './controllers/analytics.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { ReportsController } from './controllers/reports.controller';

import { DataCollectionService } from './services/data-collection.service';
import { DataProcessingService } from './services/data-processing.service';
import { DataWarehouseService } from './services/data-warehouse.service';
import { BusinessIntelligenceService } from './services/business-intelligence.service';
import { ReportingService } from './services/reporting.service';
import { RealTimeAnalyticsService } from './services/real-time-analytics.service';

import { DataCollectionProcessor } from './processors/data-collection.processor';
import { DataProcessingProcessor } from './processors/data-processing.processor';

import { AnalyticsEvent } from './entities/analytics-event.entity';
import { DataWarehouseMetric } from './entities/data-warehouse-metric.entity';
import { Report } from './entities/report.entity';
import { Dashboard } from './entities/dashboard.entity';

import { AnalyticsGateway } from './gateways/analytics.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnalyticsEvent, DataWarehouseMetric, Report, Dashboard]),
    BullModule.registerQueue({ name: 'data-collection' }, { name: 'data-processing' }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AnalyticsController, DashboardController, ReportsController],
  providers: [
    DataCollectionService,
    DataProcessingService,
    DataWarehouseService,
    BusinessIntelligenceService,
    ReportingService,
    RealTimeAnalyticsService,
    DataCollectionProcessor,
    DataProcessingProcessor,
    AnalyticsGateway,
  ],
  exports: [DataCollectionService, BusinessIntelligenceService, RealTimeAnalyticsService],
})
export class AnalyticsModule {}
