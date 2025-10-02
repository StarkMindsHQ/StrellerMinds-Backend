import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';

import type { DataProcessingService } from '../services/data-processing.service';
import type { AnalyticsEvent } from '../entities/analytics-event.entity';

@Processor('data-collection')
export class DataCollectionProcessor {
  private readonly logger = new Logger(DataCollectionProcessor.name);

  constructor(private readonly dataProcessingService: DataProcessingService) {}

  @Process('process-event')
  async processEvent(job: Job<AnalyticsEvent>) {
    this.logger.log(`Processing event: ${job.data.eventName}`);

    try {
      await this.dataProcessingService.processEvent(job.data);
      this.logger.log(`Successfully processed event: ${job.data.eventName}`);
    } catch (error) {
      this.logger.error(`Failed to process event: ${error.message}`, error.stack);
      throw error;
    }
  }
}
