import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';

export interface DeadLetterJob {
  originalQueue: string;
  originalJobId: string;
  jobName: string;
  data: any;
  error: string;
  failedAt: Date;
  retryCount: number;
  priority: number;
}

@Injectable()
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name);

  constructor(
    @InjectQueue('dead-letter') private deadLetterQueue: Queue,
    private configService: ConfigService,
  ) {}

  async moveToDeadLetter(originalQueue: Queue, failedJob: Job, error: Error): Promise<void> {
    try {
      const deadLetterJob: DeadLetterJob = {
        originalQueue: originalQueue.name,
        originalJobId: failedJob.id,
        jobName: failedJob.name,
        data: failedJob.data,
        error: error.message,
        failedAt: new Date(),
        retryCount: failedJob.attemptsMade,
        priority: failedJob.opts.priority || 0,
      };

      await this.deadLetterQueue.add('dead-letter', deadLetterJob, {
        priority: deadLetterJob.priority,
        removeOnComplete: false, // Keep DLQ jobs
        removeOnFail: false,
      });

      this.logger.warn(
        `Moved job ${failedJob.id} from ${originalQueue.name} to dead letter queue: ${error.message}`,
      );

      // Remove from original queue after moving to DLQ
      await failedJob.remove();
    } catch (dlqError) {
      this.logger.error(`Failed to move job ${failedJob.id} to dead letter queue:`, dlqError);
    }
  }

  async retryDeadLetterJob(dlqJobId: string): Promise<boolean> {
    try {
      const dlqJob = await this.deadLetterQueue.getJob(dlqJobId);
      if (!dlqJob) {
        throw new Error(`Dead letter job ${dlqJobId} not found`);
      }

      const deadLetterData: DeadLetterJob = dlqJob.data;

      // Get the original queue
      const originalQueue = await this.getQueueByName(deadLetterData.originalQueue);
      if (!originalQueue) {
        throw new Error(`Original queue ${deadLetterData.originalQueue} not found`);
      }

      // Add back to original queue with reduced priority and increased attempts
      await originalQueue.add(deadLetterData.jobName, deadLetterData.data, {
        priority: Math.max(0, deadLetterData.priority - 1), // Reduce priority
        attempts: Math.min(5, deadLetterData.retryCount + 2), // Allow more attempts
        backoff: { type: 'exponential', delay: 5000 }, // Longer backoff
      });

      // Remove from DLQ
      await dlqJob.remove();

      this.logger.log(
        `Retried dead letter job ${dlqJobId} back to ${deadLetterData.originalQueue}`,
      );

      return true;
    } catch (error) {
      this.logger.error(`Failed to retry dead letter job ${dlqJobId}:`, error);
      return false;
    }
  }

  async bulkRetryDeadLetterJobs(queueName?: string): Promise<number> {
    try {
      const jobs = await this.deadLetterQueue.getJobs(['active', 'waiting'], 0, 100);
      let retryCount = 0;

      for (const job of jobs) {
        const deadLetterData: DeadLetterJob = job.data;

        if (queueName && deadLetterData.originalQueue !== queueName) {
          continue;
        }

        const success = await this.retryDeadLetterJob(job.id);
        if (success) {
          retryCount++;
        }
      }

      this.logger.log(`Bulk retried ${retryCount} dead letter jobs`);
      return retryCount;
    } catch (error) {
      this.logger.error('Failed to bulk retry dead letter jobs:', error);
      return 0;
    }
  }

  async getDeadLetterJobs(limit: number = 50): Promise<DeadLetterJob[]> {
    try {
      const jobs = await this.deadLetterQueue.getJobs(['active', 'waiting', 'completed'], 0, limit);
      return jobs.map((job) => job.data as DeadLetterJob);
    } catch (error) {
      this.logger.error('Failed to get dead letter jobs:', error);
      return [];
    }
  }

  async getDeadLetterStats(): Promise<{
    total: number;
    byQueue: Record<string, number>;
    byError: Record<string, number>;
  }> {
    try {
      const jobs = await this.deadLetterQueue.getJobs(['active', 'waiting', 'completed'], 0, 1000);

      const stats = {
        total: jobs.length,
        byQueue: {} as Record<string, number>,
        byError: {} as Record<string, number>,
      };

      for (const job of jobs) {
        const data: DeadLetterJob = job.data;

        // Count by original queue
        stats.byQueue[data.originalQueue] = (stats.byQueue[data.originalQueue] || 0) + 1;

        // Count by error type (simplified)
        const errorType = data.error.split(':')[0] || 'Unknown';
        stats.byError[errorType] = (stats.byError[errorType] || 0) + 1;
      }

      return stats;
    } catch (error) {
      this.logger.error('Failed to get dead letter stats:', error);
      return { total: 0, byQueue: {}, byError: {} };
    }
  }

  async cleanOldDeadLetterJobs(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const jobs = await this.deadLetterQueue.getJobs(['completed'], 0, 1000);
      let cleanedCount = 0;

      for (const job of jobs) {
        const deadLetterData: DeadLetterJob = job.data;
        if (deadLetterData.failedAt < cutoffDate) {
          await job.remove();
          cleanedCount++;
        }
      }

      this.logger.log(`Cleaned ${cleanedCount} old dead letter jobs`);
      return cleanedCount;
    } catch (error) {
      this.logger.error('Failed to clean old dead letter jobs:', error);
      return 0;
    }
  }

  private async getQueueByName(queueName: string): Promise<Queue | null> {
    // This is a simplified version. In a real implementation,
    // you'd inject all queues or have a queue registry
    try {
      // For now, we'll create a new queue instance
      // In production, you'd want to inject all queues
      const config = {
        connection: {
          host: this.configService.get('REDIS_HOST', 'localhost'),
          port: this.configService.get<number>('REDIS_PORT', 6379),
          password: this.configService.get('REDIS_PASSWORD'),
        },
      };

      return new Queue(queueName, config);
    } catch (error) {
      this.logger.error(`Failed to get queue ${queueName}:`, error);
      return null;
    }
  }
}
