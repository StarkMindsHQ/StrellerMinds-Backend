import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import dataQualityConfig from './config/data-quality.config';

import { DataQualityController } from './controllers/data-quality.controller';
import { DataGovernanceController } from './controllers/data-governance.controller';
import { DataValidationController } from './controllers/data-validation.controller';

import { DataQualityService } from './services/data-quality.service';
import { DataValidationService } from './services/data-validation.service';
import { DataCleansingService } from './services/data-cleansing.service';
import { DataGovernanceService } from './services/data-governance.service';
import { DataQualityMonitoringService } from './services/data-quality-monitoring.service';
import { DataQualityReportingService } from './services/data-quality-reporting.service';

import { DataQualityProcessor } from './processors/data-quality.processor';
import { DataCleansingProcessor } from './processors/data-cleansing.processor';

import { DataQualityRule } from './entities/data-quality-rule.entity';
import { DataQualityMetric } from './entities/data-quality-metric.entity';
import { DataQualityIssue } from './entities/data-quality-issue.entity';
import { DataGovernancePolicy } from './entities/data-governance-policy.entity';
import { DataLineage } from './entities/data-lineage.entity';
import { DataQualityReport } from './entities/data-quality-report.entity';

@Module({
  imports: [
    ConfigModule.forFeature(dataQualityConfig),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forFeature([
      DataQualityRule,
      DataQualityMetric,
      DataQualityIssue,
      DataGovernancePolicy,
      DataLineage,
      DataQualityReport,
    ]),
    BullModule.registerQueue(
      { name: 'data-quality' },
      { name: 'data-cleansing' },
      { name: 'data-quality-monitoring' },
    ),
    ScheduleModule.forRoot(),
  ],
  controllers: [DataQualityController, DataGovernanceController, DataValidationController],
  providers: [
    DataQualityService,
    DataValidationService,
    DataCleansingService,
    DataGovernanceService,
    DataQualityMonitoringService,
    DataQualityReportingService,
    DataQualityProcessor,
    DataCleansingProcessor,
  ],
  exports: [DataQualityService, DataValidationService, DataCleansingService, DataGovernanceService],
})
export class DataQualityModule {}
