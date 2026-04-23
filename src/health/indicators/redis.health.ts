import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  async isHealthy(key: string, redis: Redis): Promise<HealthIndicatorResult> {
    try {
      const result = await redis.ping();
      if (result === 'PONG') {
        return this.getStatus(key, true);
      }
      throw new HealthCheckError(
        'RedisCheck failed',
        this.getStatus(key, false, { message: 'Unexpected PING response' }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Redis connection failed';
      throw new HealthCheckError(
        'RedisCheck failed',
        this.getStatus(key, false, { message }),
      );
    }
  }
}
