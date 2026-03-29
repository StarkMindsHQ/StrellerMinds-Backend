import { Injectable, Logger } from '@nestjs/common';
import { Job, JobStatus, JobPriority } from '../models/Job';
import { FailureHandler } from './FailureHandler';

@Injectable()
export class QueueProcessor {
  private readonly logger = new Logger(QueueProcessor.name);
  private isProcessing = false;
  private queue: Job[] = [];

  constructor(private readonly failureHandler: FailureHandler) {}

  /**
   * Adds a new job to the processing queue and sorts by priority.
   */
  async enqueue(job: Job): Promise<void> {
    this.logger.log(`Job enqueued: ${job.name} (ID: ${job.id}, Priority: ${JobPriority[job.priority]})`);
    this.queue.push(job);
    this.sortQueueByPriority();
    
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  private sortQueueByPriority(): void {
    this.queue.sort((a, b) => b.priority - a.priority || a.createdAt.getTime() - b.createdAt.getTime());
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;
    this.logger.log('Starting background job processing queue');

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (job) {
        await this.handleJob(job);
      }
    }

    this.logger.log('Background job processing queue finished');
    this.isProcessing = false;
  }

  private async handleJob(job: Job): Promise<void> {
    job.status = JobStatus.PROCESSING;
    job.processedAt = new Date();
    this.logger.debug(`Processing job: ${job.name} (ID: ${job.id})`);

    try {
      // Simulate asynchronous background job execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      job.status = JobStatus.COMPLETED;
      job.completedAt = new Date();
      this.logger.info(`Job completed: ${job.name} (ID: ${job.id})`);
    } catch (error) {
      this.failureHandler.handleFailure(job, error as Error);
    }
  }

  /**
   * Retrieves comprehensive job performance metrics.
   */
  getJobMetrics(): any {
    const total = this.queue.length;
    const highPriorityCount = this.queue.filter(j => j.priority >= JobPriority.HIGH).length;
    
    return {
      totalQueued: total,
      highPriority: highPriorityCount,
      isProcessing: this.isProcessing,
      status: 'active',
      uptime: process.uptime(),
    };
  }
}
