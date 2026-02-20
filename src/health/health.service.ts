import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  HealthCheckService,
  HealthIndicatorResult,
  HealthCheckResult,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { Gauge, Counter, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly registry = new Registry();

  private readonly healthCheckCounter: Counter<string>;
  private readonly serviceUptime: Gauge<string>;
  private readonly serviceHealthStatus: Gauge<string>;
  private readonly memoryUsageGauge: Gauge<string>;
  private readonly requestDurationGauge: Gauge<string>;

  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly memoryHealthIndicator: MemoryHealthIndicator,
    private readonly diskHealthIndicator: DiskHealthIndicator,
    private readonly httpHealthIndicator: HttpHealthIndicator,
  ) {
    collectDefaultMetrics({ register: this.registry });

    this.healthCheckCounter = new Counter({
      name: 'health_check_requests_total',
      help: 'Total number of health check requests by type',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.serviceUptime = new Gauge({
      name: 'service_uptime_seconds',
      help: 'Service uptime in seconds',
      registers: [this.registry],
    });

    this.serviceHealthStatus = new Gauge({
      name: 'service_health_status',
      help: 'Service health status (1 = healthy, 0 = unhealthy)',
      labelNames: ['service'],
      registers: [this.registry],
    });

    this.memoryUsageGauge = new Gauge({
      name: 'service_memory_usage_bytes',
      help: 'Service memory usage in bytes',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.requestDurationGauge = new Gauge({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['endpoint', 'method'],
      registers: [this.registry],
    });

    setInterval(() => {
      this.serviceUptime.set(process.uptime());
    }, 1000);
  }

  async check() {
    this.healthCheckCounter.inc({ type: 'full' });
    const startTime = Date.now();

    try {
      const healthResult: HealthCheckResult = await this.healthCheckService.check([
        () => this.checkMemoryHealth(),
        () => this.checkDiskHealth(),
        () => this.checkApplicationHealth(),
      ]);

      const duration = (Date.now() - startTime) / 1000;
      this.requestDurationGauge.set({ endpoint: 'health', method: 'GET' }, duration);

      return {
        status: healthResult.status === 'ok' ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: healthResult.details,
        duration: `${duration.toFixed(3)}s`,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
      };
    } catch (error) {
      this.logger.error('Health check failed', error.stack);
      this.serviceHealthStatus.set({ service: 'application' }, 0);

      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        error: error.message,
        checks: {
          application: {
            status: 'error',
            message: 'Health check execution failed',
          },
        },
      };
    }
  }

  async readiness() {
    this.healthCheckCounter.inc({ type: 'readiness' });
    const startTime = Date.now();

    try {
      const healthResult = await this.healthCheckService.check([
        () => this.checkMemoryHealth(),
        () => this.checkDiskHealth(),
      ]);

      const duration = (Date.now() - startTime) / 1000;
      this.requestDurationGauge.set({ endpoint: 'health/ready', method: 'GET' }, duration);

      if (healthResult.status === 'ok') {
        return {
          status: 'ready',
          timestamp: new Date().toISOString(),
          dependencies: {
            memory: 'available',
            disk: 'available',
          },
        };
      } else {
        throw new Error('Service not ready');
      }
    } catch (error) {
      this.logger.error('Readiness check failed', error.message);
      throw new Error(`Service not ready: ${error.message}`);
    }
  }

  async liveness() {
    this.healthCheckCounter.inc({ type: 'liveness' });
    const startTime = Date.now();

    const memoryUsage = process.memoryUsage();
    Object.entries(memoryUsage).forEach(([type, value]) => {
      this.memoryUsageGauge.set({ type }, value);
    });

    const duration = (Date.now() - startTime) / 1000;
    this.requestDurationGauge.set({ endpoint: 'health/live', method: 'GET' }, duration);

    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: memoryUsage,
      pid: process.pid,
      node_version: process.version,
    };
  }

  private async checkMemoryHealth(): Promise<HealthIndicatorResult> {
    try {
      const result = await this.memoryHealthIndicator.checkHeap('memory_heap', 512 * 1024 * 1024); // 512MB limit
      this.serviceHealthStatus.set({ service: 'memory' }, 1);
      return result;
    } catch (error) {
      this.serviceHealthStatus.set({ service: 'memory' }, 0);
      throw error;
    }
  }

  private async checkDiskHealth(): Promise<HealthIndicatorResult> {
    try {
      const result = await this.diskHealthIndicator.checkStorage('disk', {
        path: '/',
        thresholdPercent: 0.9,
      });
      this.serviceHealthStatus.set({ service: 'disk' }, 1);
      return result;
    } catch (error) {
      this.serviceHealthStatus.set({ service: 'disk' }, 0);
      throw error;
    }
  }

  private async checkApplicationHealth(): Promise<HealthIndicatorResult> {
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      if (heapUsedPercent > 90) {
        throw new Error(`High memory usage: ${heapUsedPercent.toFixed(2)}%`);
      }

      this.serviceHealthStatus.set({ service: 'application' }, 1);

      return {
        application: {
          status: 'up',
          version: process.env.npm_package_version || '1.0.0',
          node: process.version,
          memory: {
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            heapUsedPercent: heapUsedPercent.toFixed(2),
          },
        },
      };
    } catch (error) {
      this.serviceHealthStatus.set({ service: 'application' }, 0);
      return {
        application: {
          status: 'down',
          error: error.message,
        },
      };
    }
  }

  async getMetrics(): Promise<string> {
    try {
      return await this.registry.metrics();
    } catch (error) {
      this.logger.error('Failed to get metrics', error);
      return '# Error collecting metrics\n';
    }
  }

  async getDetailedHealth() {
    const [fullCheck, readiness, liveness] = await Promise.allSettled([
      this.check(),
      this.readiness().catch((err) => ({ status: 'error', message: err.message })),
      this.liveness(),
    ]);

    return {
      summary: {
        status: fullCheck.status === 'fulfilled' ? fullCheck.value.status : 'error',
        timestamp: new Date().toISOString(),
      },
      checks: {
        full: this.getSettledResult(fullCheck),
        readiness: this.getSettledResult(readiness),
        liveness: this.getSettledResult(liveness),
      },
      system: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
        pid: process.pid,
        cwd: process.cwd(),
        env: process.env.NODE_ENV,
      },
      metrics: {
        hasMetrics: true,
        endpoint: '/health/metrics',
      },
    };
  }

  private getSettledResult(result: PromiseSettledResult<any>) {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      status: 'error',
      message: result.reason?.message || 'Unknown error',
    };
  }
}
