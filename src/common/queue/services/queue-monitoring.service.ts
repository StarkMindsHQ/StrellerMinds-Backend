import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

export interface QueueMetrics {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  throughput: number; // jobs per minute
  avgProcessingTime: number; // milliseconds
  errorRate: number; // percentage
  lastUpdated: Date;
}

export interface QueueHealthStatus {
  queueName: string;
  isHealthy: boolean;
  issues: string[];
  recommendations: string[];
}

@Injectable()
export class QueueMonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueMonitoringService.name);
  private readonly metrics = new Map<string, QueueMetrics>();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectQueue('analytics') private analyticsQueue: Queue,
    @InjectQueue('file-processing') private fileProcessingQueue: Queue,
    @InjectQueue('dead-letter') private deadLetterQueue: Queue,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeMonitoring();
    // Start periodic monitoring
    this.monitoringInterval = setInterval(
      () => this.collectMetrics(),
      30000, // Every 30 seconds
    );
  }

  async onModuleDestroy() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  private async initializeMonitoring() {
    const queues = [
      { name: 'analytics', queue: this.analyticsQueue },
      { name: 'file-processing', queue: this.fileProcessingQueue },
      { name: 'dead-letter', queue: this.deadLetterQueue },
    ];

    for (const { name, queue } of queues) {
      // Set up a minimal event listener for waiting events; other events are tracked via Worker/events.
      try {
        queue.on('waiting', (job: any) => {
          this.logger.debug(`Job ${job?.id || job} waiting in ${name} queue`);
        });
      } catch (error) {
        this.logger.warn(`Failed to set up event listeners for ${name} queue:`, error);
      }
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async collectMetrics() {
    const queues = [
      { name: 'analytics', queue: this.analyticsQueue },
      { name: 'file-processing', queue: this.fileProcessingQueue },
      { name: 'dead-letter', queue: this.deadLetterQueue },
    ];

    for (const { name, queue } of queues) {
      try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(),
          queue.getFailed(),
          queue.getDelayed(),
        ]);

        const metrics: QueueMetrics = {
          queueName: name,
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
          throughput: await this.calculateThroughput(queue),
          avgProcessingTime: await this.calculateAvgProcessingTime(queue),
          errorRate: await this.calculateErrorRate(queue),
          lastUpdated: new Date(),
        };

        this.metrics.set(name, metrics);

        // Log warnings for unhealthy queues
        if (metrics.errorRate > 10) {
          this.logger.warn(`High error rate in ${name} queue: ${metrics.errorRate.toFixed(2)}%`);
        }

        if (metrics.waiting > 100) {
          this.logger.warn(`High backlog in ${name} queue: ${metrics.waiting} waiting jobs`);
        }
      } catch (error) {
        this.logger.error(`Failed to collect metrics for ${name} queue:`, error);
      }
    }
  }

  private async calculateThroughput(queue: Queue): Promise<number> {
    try {
      const completed = await queue.getCompleted(0, 100);
      if (completed.length === 0) return 0;

      const now = Date.now();
      const oneHourAgo = now - 3600000; // 1 hour ago

      const recentJobs = completed.filter((job) => job.finishedOn && job.finishedOn > oneHourAgo);

      return recentJobs.length; // jobs per hour
    } catch (error) {
      this.logger.error('Failed to calculate throughput:', error);
      return 0;
    }
  }

  private async calculateAvgProcessingTime(queue: Queue): Promise<number> {
    try {
      const completed = await queue.getCompleted(0, 50);
      if (completed.length === 0) return 0;

      const processingTimes = completed
        .filter((job) => job.finishedOn && job.processedOn)
        .map((job) => job.finishedOn! - job.processedOn!);

      if (processingTimes.length === 0) return 0;

      return processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
    } catch (error) {
      this.logger.error('Failed to calculate avg processing time:', error);
      return 0;
    }
  }

  private async calculateErrorRate(queue: Queue): Promise<number> {
    try {
      const [completed, failed] = await Promise.all([queue.getCompleted(), queue.getFailed()]);

      const total = completed.length + failed.length;
      if (total === 0) return 0;

      return (failed.length / total) * 100;
    } catch (error) {
      this.logger.error('Failed to calculate error rate:', error);
      return 0;
    }
  }

  private recordJobCompletion(queueName: string, job: any) {
    // Could store in database for historical analysis
    this.logger.debug(`Job ${job.id || job} completed successfully in ${queueName}`);
  }

  private recordJobFailure(queueName: string, job: any, error: any) {
    // Could store failure details for analysis
    this.logger.warn(`Job ${job.id || job} failed in ${queueName}: ${error?.message || error}`);
  }

  async getMetrics(queueName?: string): Promise<QueueMetrics[]> {
    if (queueName) {
      const metrics = this.metrics.get(queueName);
      return metrics ? [metrics] : [];
    }
    return Array.from(this.metrics.values());
  }

  async getHealthStatus(): Promise<QueueHealthStatus[]> {
    const statuses: QueueHealthStatus[] = [];

    for (const [queueName, metrics] of Array.from(this.metrics.entries())) {
      const status: QueueHealthStatus = {
        queueName,
        isHealthy: true,
        issues: [],
        recommendations: [],
      };

      // Check for issues
      if (metrics.errorRate > 15) {
        status.isHealthy = false;
        status.issues.push(`High error rate: ${metrics.errorRate.toFixed(2)}%`);
        status.recommendations.push('Investigate and fix failing jobs');
      }

      if (metrics.waiting > 200) {
        status.isHealthy = false;
        status.issues.push(`High backlog: ${metrics.waiting} waiting jobs`);
        status.recommendations.push('Consider scaling queue workers or optimizing job processing');
      }

      if (metrics.avgProcessingTime > 300000) {
        // 5 minutes
        status.isHealthy = false;
        status.issues.push(`Slow processing: ${metrics.avgProcessingTime}ms average`);
        status.recommendations.push('Optimize job processing logic or increase resources');
      }

      if (metrics.active === 0 && metrics.waiting > 0) {
        status.issues.push('Jobs waiting but no active workers');
        status.recommendations.push('Check if workers are running and healthy');
      }

      statuses.push(status);
    }

    return statuses;
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    if (queue) {
      await queue.pause();
      this.logger.log(`Paused ${queueName} queue`);
    }
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    if (queue) {
      await queue.resume();
      this.logger.log(`Resumed ${queueName} queue`);
    }
  }

  async cleanQueue(queueName: string, grace: number = 24 * 60 * 60 * 1000): Promise<void> {
    const queue = this.getQueueByName(queueName);
    if (queue) {
      await queue.clean(grace, 100, 'completed');
      await queue.clean(grace, 100, 'failed');
      this.logger.log(`Cleaned ${queueName} queue`);
    }
  }

  private getQueueByName(queueName: string): Queue | null {
    switch (queueName) {
      case 'analytics':
        return this.analyticsQueue;
      case 'file-processing':
        return this.fileProcessingQueue;
      case 'dead-letter':
        return this.deadLetterQueue;
      default:
        return null;
    }
  }
}
