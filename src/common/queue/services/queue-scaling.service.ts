import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueMonitoringService } from './queue-monitoring.service';

export interface ScalingConfig {
  queueName: string;
  minWorkers: number;
  maxWorkers: number;
  targetThroughput: number; // jobs per minute
  scaleUpThreshold: number; // percentage of target throughput
  scaleDownThreshold: number; // percentage of target throughput
  cooldownPeriod: number; // minutes between scaling actions
}

@Injectable()
export class QueueScalingService implements OnModuleInit {
  private readonly logger = new Logger(QueueScalingService.name);
  private readonly scalingConfigs: Map<string, ScalingConfig> = new Map();
  private readonly activeWorkers: Map<string, Worker[]> = new Map();
  private readonly lastScalingAction: Map<string, Date> = new Map();

  constructor(
    @InjectQueue('analytics') private analyticsQueue: Queue,
    @InjectQueue('file-processing') private fileProcessingQueue: Queue,
    private configService: ConfigService,
    private monitoringService: QueueMonitoringService,
  ) {
    this.initializeScalingConfigs();
  }

  async onModuleInit() {
    await this.initializeWorkers();
  }

  private initializeScalingConfigs() {
    // Configure scaling for analytics queue
    this.scalingConfigs.set('analytics', {
      queueName: 'analytics',
      minWorkers: 1,
      maxWorkers: 5,
      targetThroughput: 60, // 60 jobs per minute
      scaleUpThreshold: 80, // Scale up when throughput drops below 80% of target
      scaleDownThreshold: 120, // Scale down when throughput exceeds 120% of target
      cooldownPeriod: 5, // 5 minutes between scaling actions
    });

    // Configure scaling for file-processing queue
    this.scalingConfigs.set('file-processing', {
      queueName: 'file-processing',
      minWorkers: 1,
      maxWorkers: 3,
      targetThroughput: 10, // 10 jobs per minute (slower processing)
      scaleUpThreshold: 70,
      scaleDownThreshold: 130,
      cooldownPeriod: 10, // 10 minutes between scaling actions
    });
  }

  private async initializeWorkers() {
    for (const [queueName, config] of this.scalingConfigs) {
      const workers: Worker[] = [];
      const queue = this.getQueueByName(queueName);

      if (queue) {
        // Start with minimum workers
        for (let i = 0; i < config.minWorkers; i++) {
          const worker = await this.createWorker(queueName, queue);
          workers.push(worker);
        }

        this.activeWorkers.set(queueName, workers);
        this.logger.log(`Initialized ${config.minWorkers} workers for ${queueName} queue`);
      }
    }
  }

  @Cron('*/2 * * * *') // every 2 minutes
  async evaluateScaling() {
    for (const [queueName, config] of this.scalingConfigs) {
      try {
        await this.evaluateQueueScaling(queueName, config);
      } catch (error) {
        this.logger.error(`Failed to evaluate scaling for ${queueName}:`, error);
      }
    }
  }

  private async evaluateQueueScaling(queueName: string, config: ScalingConfig) {
    // Check cooldown period
    const lastAction = this.lastScalingAction.get(queueName);
    if (lastAction) {
      const cooldownMs = config.cooldownPeriod * 60 * 1000;
      if (Date.now() - lastAction.getTime() < cooldownMs) {
        return; // Still in cooldown
      }
    }

    const metrics = await this.monitoringService.getMetrics(queueName);
    if (metrics.length === 0) return;

    const metric = metrics[0];
    const currentWorkers = this.activeWorkers.get(queueName)?.length || 0;

    // Calculate current throughput efficiency
    const throughputEfficiency = (metric.throughput / config.targetThroughput) * 100;

    let action: 'scale-up' | 'scale-down' | 'none' = 'none';

    // Determine scaling action
    if (throughputEfficiency < config.scaleUpThreshold && metric.waiting > 10) {
      action = 'scale-up';
    } else if (
      throughputEfficiency > config.scaleDownThreshold &&
      currentWorkers > config.minWorkers
    ) {
      action = 'scale-down';
    }

    // Execute scaling action
    if (action === 'scale-up' && currentWorkers < config.maxWorkers) {
      await this.scaleUp(queueName, config);
    } else if (action === 'scale-down' && currentWorkers > config.minWorkers) {
      await this.scaleDown(queueName, config);
    }
  }

  private async scaleUp(queueName: string, config: ScalingConfig) {
    const currentWorkers = this.activeWorkers.get(queueName) || [];
    const queue = this.getQueueByName(queueName);

    if (!queue || currentWorkers.length >= config.maxWorkers) {
      return;
    }

    try {
      const newWorker = await this.createWorker(queueName, queue);
      currentWorkers.push(newWorker);
      this.activeWorkers.set(queueName, currentWorkers);
      this.lastScalingAction.set(queueName, new Date());

      this.logger.log(`Scaled up ${queueName} queue: ${currentWorkers.length} workers`);
    } catch (error) {
      this.logger.error(`Failed to scale up ${queueName} queue:`, error);
    }
  }

  private async scaleDown(queueName: string, config: ScalingConfig) {
    const currentWorkers = this.activeWorkers.get(queueName) || [];

    if (currentWorkers.length <= config.minWorkers) {
      return;
    }

    try {
      // Remove the last worker
      const workerToRemove = currentWorkers.pop();
      if (workerToRemove) {
        await workerToRemove.close();
      }

      this.activeWorkers.set(queueName, currentWorkers);
      this.lastScalingAction.set(queueName, new Date());

      this.logger.log(`Scaled down ${queueName} queue: ${currentWorkers.length} workers`);
    } catch (error) {
      this.logger.error(`Failed to scale down ${queueName} queue:`, error);
    }
  }

  private async createWorker(queueName: string, queue: Queue): Promise<Worker> {
    // Create a worker that processes jobs
    // Note: This is a simplified implementation. In practice, you'd need
    // to handle the actual job processing logic here or delegate to processors
    const worker = new Worker(
      queueName,
      async (job) => {
        this.logger.debug(`Processing job ${job.id} in ${queueName}`);

        // This is where job processing would happen
        // For now, we'll just simulate processing
        await new Promise((resolve) => setTimeout(resolve, 1000));

        return { success: true };
      },
      {
        connection: {
          host: this.configService.get('REDIS_HOST', 'localhost'),
          port: this.configService.get<number>('REDIS_PORT', 6379),
          password: this.configService.get('REDIS_PASSWORD'),
        },
        concurrency: 1, // One job per worker
      },
    );

    worker.on('completed', (job) => {
      this.logger.debug(`Worker completed job ${job.id} in ${queueName}`);
    });

    worker.on('failed', (job, err) => {
      this.logger.error(`Worker failed job ${job.id} in ${queueName}:`, err);
    });

    return worker;
  }

  async getScalingStatus(queueName?: string): Promise<
    {
      queueName: string;
      currentWorkers: number;
      config: ScalingConfig;
      lastScalingAction?: Date;
    }[]
  > {
    const statuses = [];

    const queues = queueName ? [queueName] : Array.from(this.scalingConfigs.keys());

    for (const qName of queues) {
      const config = this.scalingConfigs.get(qName);
      const workers = this.activeWorkers.get(qName) || [];
      const lastAction = this.lastScalingAction.get(qName);

      if (config) {
        statuses.push({
          queueName: qName,
          currentWorkers: workers.length,
          config,
          lastScalingAction: lastAction,
        });
      }
    }

    return statuses;
  }

  async manualScale(queueName: string, targetWorkers: number): Promise<boolean> {
    const config = this.scalingConfigs.get(queueName);
    if (!config) {
      this.logger.error(`No scaling config found for ${queueName}`);
      return false;
    }

    if (targetWorkers < config.minWorkers || targetWorkers > config.maxWorkers) {
      this.logger.error(
        `Invalid target workers ${targetWorkers} for ${queueName}. Must be between ${config.minWorkers} and ${config.maxWorkers}`,
      );
      return false;
    }

    const currentWorkers = this.activeWorkers.get(queueName) || [];
    const currentCount = currentWorkers.length;

    try {
      if (targetWorkers > currentCount) {
        // Scale up
        const queue = this.getQueueByName(queueName);
        if (!queue) return false;

        for (let i = currentCount; i < targetWorkers; i++) {
          const newWorker = await this.createWorker(queueName, queue);
          currentWorkers.push(newWorker);
        }
      } else if (targetWorkers < currentCount) {
        // Scale down
        for (let i = currentCount; i > targetWorkers; i--) {
          const workerToRemove = currentWorkers.pop();
          if (workerToRemove) {
            await workerToRemove.close();
          }
        }
      }

      this.activeWorkers.set(queueName, currentWorkers);
      this.lastScalingAction.set(queueName, new Date());

      this.logger.log(`Manually scaled ${queueName} queue to ${targetWorkers} workers`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to manually scale ${queueName}:`, error);
      return false;
    }
  }

  private getQueueByName(queueName: string): Queue | null {
    switch (queueName) {
      case 'analytics':
        return this.analyticsQueue;
      case 'file-processing':
        return this.fileProcessingQueue;
      default:
        return null;
    }
  }
}
