import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HealthCheckResult, HealthStatus, MonitoringConfig } from '../interfaces/monitoring-config.interface';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private healthChecks = new Map<string, HealthCheckResult>();
  private customHealthChecks = new Map<string, () => Promise<HealthCheckResult>>();

  constructor(private readonly config: MonitoringConfig) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async performHealthChecks(): Promise<void> {
    if (!this.config.enableHealthChecks) return;

    try {
      // Perform built-in health checks
      await this.checkDatabaseHealth();
      await this.checkMemoryHealth();
      await this.checkDiskHealth();

      // Perform custom health checks
      for (const [name, checkFn] of this.customHealthChecks) {
        try {
          const result = await checkFn();
          this.healthChecks.set(name, result);
        } catch (error) {
          this.healthChecks.set(name, {
            service: name,
            status: HealthStatus.UNHEALTHY,
            timestamp: new Date(),
            error: error.message
          });
        }
      }

      this.logger.debug('Health checks completed');
    } catch (error) {
      this.logger.error('Failed to perform health checks', error.stack);
    }
  }

  private async checkDatabaseHealth(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Simulate database health check
      // In real implementation, you'd check actual database connection
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const responseTime = Date.now() - startTime;
      
      this.healthChecks.set('database', {
        service: 'database',
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        responseTime,
        details: {
          connectionPool: 'active',
          queryTime: responseTime
        }
      });
    } catch (error) {
      this.healthChecks.set('database', {
        service: 'database',
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        error: error.message
      });
    }
  }

  private async checkMemoryHealth(): Promise<void> {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const memoryUsagePercent = (heapUsedMB / heapTotalMB) * 100;

    let status = HealthStatus.HEALTHY;
    if (memoryUsagePercent > 90) {
      status = HealthStatus.UNHEALTHY;
    } else if (memoryUsagePercent > 75) {
      status = HealthStatus.DEGRADED;
    }

    this.healthChecks.set('memory', {
      service: 'memory',
      status,
      timestamp: new Date(),
      details: {
        heapUsed: `${heapUsedMB.toFixed(2)} MB`,
        heapTotal: `${heapTotalMB.toFixed(2)} MB`,
        usagePercent: `${memoryUsagePercent.toFixed(2)}%`
      }
    });
  }

  private async checkDiskHealth(): Promise<void> {
    // Simplified disk health check
    // In production, you'd want to check actual disk usage
    this.healthChecks.set('disk', {
      service: 'disk',
      status: HealthStatus.HEALTHY,
      timestamp: new Date(),
      details: {
        usage: '45%',
        available: '100GB'
      }
    });
  }

  // Public methods
  registerHealthCheck(name: string, checkFn: () => Promise<HealthCheckResult>): void {
    this.customHealthChecks.set(name, checkFn);
    this.logger.log(`Registered custom health check: ${name}`);
  }

  unregisterHealthCheck(name: string): void {
    this.customHealthChecks.delete(name);
    this.healthChecks.delete(name);
    this.logger.log(`Unregistered health check: ${name}`);
  }

  getHealthStatus(service?: string): HealthCheckResult | HealthCheckResult[] {
    if (service) {
      return this.healthChecks.get(service);
    }
    return Array.from(this.healthChecks.values());
  }

  getOverallHealth(): { status: HealthStatus; services: HealthCheckResult[] } {
    const services = Array.from(this.healthChecks.values());
    
    if (services.length === 0) {
      return { status: HealthStatus.UNKNOWN, services: [] };
    }

    const hasUnhealthy = services.some(s => s.status === HealthStatus.UNHEALTHY);
    const hasDegraded = services.some(s => s.status === HealthStatus.DEGRADED);

    let overallStatus = HealthStatus.HEALTHY;
    if (hasUnhealthy) {
      overallStatus = HealthStatus.UNHEALTHY;
    } else if (hasDegraded) {
      overallStatus = HealthStatus.DEGRADED;
    }

    return { status: overallStatus, services };
  }

  async performImmediateHealthCheck(service?: string): Promise<HealthCheckResult | HealthCheckResult[]> {
    if (service) {
      const checkFn = this.customHealthChecks.get(service);
      if (checkFn) {
        const result = await checkFn();
        this.healthChecks.set(service, result);
        return result;
      }
      return this.healthChecks.get(service);
    }

    await this.performHealthChecks();
    return Array.from(this.healthChecks.values());
  }
}
