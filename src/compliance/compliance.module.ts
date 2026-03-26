import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ComplianceController } from './compliance.controller';
import { ComplianceMonitoringService } from './services/compliance-monitoring.service';

@Module({
  imports: [ConfigModule],
  controllers: [ComplianceController],
  providers: [ComplianceMonitoringService],
  exports: [ComplianceMonitoringService],
})
export class ComplianceModule {}
