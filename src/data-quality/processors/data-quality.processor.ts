import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';

import type { DataQualityMonitoringService } from '../services/data-quality-monitoring.service';

@Processor('data-quality')
export class DataQualityProcessor {
  private readonly logger = new Logger(DataQualityProcessor.name);

  constructor(private readonly monitoringService: DataQualityMonitoringService) {}

  @Process('process-quality-check')
  async processQualityCheck(
    job: Job<{
      entityType: string;
      result: any;
      timestamp: Date;
    }>,
  ) {
    this.logger.log(`Processing quality check for ${job.data.entityType}`);

    try {
      // Additional processing logic here
      // Could trigger alerts, notifications, etc.

      this.logger.log(`Quality check processed for ${job.data.entityType}`);
    } catch (error) {
      this.logger.error(`Failed to process quality check: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('monitor-thresholds')
  async monitorThresholds(job: Job) {
    this.logger.log('Processing threshold monitoring');

    try {
      await this.monitoringService.monitorQualityThresholds();
      this.logger.log('Threshold monitoring completed');
    } catch (error) {
      this.logger.error(`Threshold monitoring failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
