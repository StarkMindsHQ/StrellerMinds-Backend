import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError, HealthIndicatorStatus } from '@nestjs/terminus';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { QueueMonitoringService } from '../services/queue-monitoring.service';

@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  constructor(
    @InjectQueue('analytics') private analyticsQueue: Queue,
    @InjectQueue('file-processing') private fileProcessingQueue: Queue,
    @InjectQueue('dead-letter') private deadLetterQueue: Queue,
    private monitoringService: QueueMonitoringService,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const queues = [
      { name: 'analytics', queue: this.analyticsQueue },
      { name: 'file-processing', queue: this.fileProcessingQueue },
      { name: 'dead-letter', queue: this.deadLetterQueue },
    ];

    const healthStatuses = await Promise.all(
      queues.map(async ({ name, queue }) => {
        try {
          // Check if queue is connected
          const client = await queue.client;
          await client.ping();

          // Get basic queue stats
          const [waiting, active, failed] = await Promise.all([
            queue.getWaiting(),
            queue.getActive(),
            queue.getFailed(),
          ]);

          // Get monitoring metrics
          const metrics = await this.monitoringService.getMetrics(name);
          const metric = metrics[0];

          const isHealthy = this.evaluateQueueHealth(name, {
            waiting: waiting.length,
            active: active.length,
            failed: failed.length,
            errorRate: metric?.errorRate || 0,
          });

          return {
            name,
            healthy: isHealthy,
            details: {
              waiting: waiting.length,
              active: active.length,
              failed: failed.length,
              errorRate: metric?.errorRate || 0,
              throughput: metric?.throughput || 0,
            },
          };
        } catch (error) {
          return {
            name,
            healthy: false,
            error: error.message,
            details: { error: error.message },
          };
        }
      }),
    );

    const unhealthyQueues = healthStatuses.filter((status) => !status.healthy);

    if (unhealthyQueues.length > 0) {
      throw new HealthCheckError('Queue health check failed', {
        [key]: {
          status: 'down',
          queues: healthStatuses,
          message: `${unhealthyQueues.length} queue(s) are unhealthy`,
        },
      });
    }

    return {
      [key]: {
        status: 'up',
        queues: healthStatuses,
      },
    };
  }

  private evaluateQueueHealth(
    queueName: string,
    stats: { waiting: number; active: number; failed: number; errorRate: number },
  ): boolean {
    // Define health criteria based on queue type
    const thresholds = {
      analytics: {
        maxWaiting: 100,
        maxFailed: 50,
        maxErrorRate: 10,
      },
      'file-processing': {
        maxWaiting: 50,
        maxFailed: 20,
        maxErrorRate: 15,
      },
      'dead-letter': {
        maxWaiting: 1000, // DLQ can have more jobs
        maxFailed: 0, // DLQ jobs shouldn't fail
        maxErrorRate: 0,
      },
    };

    const threshold = thresholds[queueName as keyof typeof thresholds];
    if (!threshold) return true; // Unknown queue, assume healthy

    return (
      stats.waiting <= threshold.maxWaiting &&
      stats.failed <= threshold.maxFailed &&
      stats.errorRate <= threshold.maxErrorRate
    );
  }
}
