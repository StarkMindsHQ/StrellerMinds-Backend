import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';

@Injectable()
export class EmailQueueHealthIndicator extends HealthIndicator {
  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('email-dlq') private dlqQueue: Queue,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const [emailActive, emailWaiting, emailFailed, emailDelayed] = await Promise.all([
        this.emailQueue.getActiveCount(),
        this.emailQueue.getWaitingCount(),
        this.emailQueue.getFailedCount(),
        this.emailQueue.getDelayedCount(),
      ]);

      const dlqCount = await this.dlqQueue.getWaitingCount();

      const isHealthy = emailActive >= 0 && emailWaiting >= 0;

      const result = this.getStatus(key, isHealthy, {
        email: {
          active: emailActive,
          waiting: emailWaiting,
          failed: emailFailed,
          delayed: emailDelayed,
        },
        dlq: {
          count: dlqCount,
        },
      });

      if (isHealthy) {
        return result;
      }

      throw new HealthCheckError('Email queue health check failed', result);
    } catch (error) {
      throw new HealthCheckError('Email queue health check failed', {
        [key]: {
          status: 'down',
          error: error.message,
        },
      });
    }
  }
}
