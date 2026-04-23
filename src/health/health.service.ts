import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckService, HealthCheckResult, HealthIndicatorResult } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { ExternalServicesHealthIndicator } from './indicators/external-services.health';
import Redis from 'ioredis';

export interface DetailedHealthResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: Record<string, any>;
}

@Injectable()
export class HealthService {
  private readonly redis: Redis | null;

  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly dbHealthIndicator: DatabaseHealthIndicator,
    private readonly redisHealthIndicator: RedisHealthIndicator,
    private readonly externalServicesHealthIndicator: ExternalServicesHealthIndicator,
    private readonly configService: ConfigService,
  ) {
    // Initialize Redis client only if configured
    const redisHost = this.configService.get<string>('REDIS_HOST');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

    if (redisHost) {
      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Don't retry on health checks
        lazyConnect: true,
      });
    } else {
      this.redis = null;
    }
  }

  /**
   * Full health check: database + redis + external services
   * Used by GET /health
   */
  async checkFullHealth(): Promise<DetailedHealthResult> {
    const healthResult = await this.healthCheckService.check([
      () => this.dbHealthIndicator.isHealthy('database'),
      () => this.checkRedis(),
      () => this.externalServicesHealthIndicator.isHealthy('external_services'),
    ]);

    return this.buildDetailedResult(healthResult);
  }

  /**
   * Liveness probe: is the application process alive?
   * Used by GET /health/live — lightweight, no external checks.
   */
  async checkLiveness(): Promise<DetailedHealthResult> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: this.getVersion(),
      environment: this.getEnvironment(),
      checks: {},
    };
  }

  /**
   * Readiness probe: is the application ready to accept traffic?
   * Used by GET /health/ready — checks database and redis only (not external services).
   */
  async checkReadiness(): Promise<DetailedHealthResult> {
    const healthResult = await this.healthCheckService.check([
      () => this.dbHealthIndicator.isHealthy('database'),
      () => this.checkRedis(),
    ]);

    return this.buildDetailedResult(healthResult);
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    if (!this.redis) {
      // Redis not configured — skip the check gracefully
      return { redis: { status: 'up', skipReason: 'not_configured' } } as HealthIndicatorResult;
    }
    return this.redisHealthIndicator.isHealthy('redis', this.redis);
  }

  private buildDetailedResult(healthResult: HealthCheckResult): DetailedHealthResult {
    const isHealthy = healthResult.status === 'ok';
    const isDegraded =
      !isHealthy &&
      Object.values(healthResult.info || {}).some((detail: any) => detail.status === 'up');

    return {
      status: isHealthy ? 'healthy' : isDegraded ? 'degraded' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: this.getVersion(),
      environment: this.getEnvironment(),
      checks: {
        ...healthResult.info,
        ...healthResult.error,
        ...healthResult.details,
      },
    };
  }

  private getVersion(): string {
    return this.configService.get<string>('npm_package_version', '1.0.0');
  }

  private getEnvironment(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }
}
