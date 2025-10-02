import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';

import type { DataWarehouseService } from '../services/data-warehouse.service';

@Processor('data-processing')
export class DataProcessingProcessor {
  private readonly logger = new Logger(DataProcessingProcessor.name);

  constructor(private readonly dataWarehouseService: DataWarehouseService) {}

  @Process('aggregate-metrics')
  async aggregateMetrics(job: Job<{ startTime: Date; endTime: Date; granularity: string }>) {
    this.logger.log(`Aggregating metrics: ${job.data.granularity}`);

    try {
      await this.dataWarehouseService.aggregateMetrics(
        job.data.startTime,
        job.data.endTime,
        job.data.granularity,
      );
      this.logger.log(`Successfully aggregated metrics: ${job.data.granularity}`);
    } catch (error) {
      this.logger.error(`Failed to aggregate metrics: ${error.message}`, error.stack);
      throw error;
    }
  }
}
