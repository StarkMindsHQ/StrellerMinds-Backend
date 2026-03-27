import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import {
  HealthCheckService,
  HealthIndicatorResult,
  HealthCheckResult,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HttpHealthIndicator,
  HealthCheckError,
} from '@nestjs/terminus';
import { Gauge, Counter, Registry, collectDefaultMetrics } from 'prom-client';
import { ApmService } from '../monitoring/services/apm.service';
import { CacheOptimizationService } from '../monitoring/services/cache-optimization.service';
import { DatabaseOptimizationService } from '../monitoring/services/database-optimization.service';
import { QueueHealthIndicator } from '../common/queue/health/queue-health.indicator';
import { DataSource } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronExpression } from '@nestjs/schedule';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly registry = new Registry();

  private readonly healthCheckCounter: Counter<string>;
  private readonly serviceUptime: Gauge<string>;
  private readonly serviceHealthStatus: Gauge<string>;
  private readonly memoryUsageGauge: Gauge<string>;
  private readonly requestDurationGauge: Gauge<string>;
  private readonly dependencyHealthGauge: Gauge<string>;
  private readonly healthAlertCounter: Counter<string>;

  private dependencyHealthStatus: Map<string, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: Date;
    latency: number;
    error?: string;
    consecutiveFailures: number;
  }> = new Map();

  private alertThresholds = {
    consecutiveFailures: 3,
    responseTimeMs: 5000,
    hitRatePercent: 50,
  };

  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly memoryHealthIndicator: MemoryHealthIndicator,
    private readonly diskHealthIndicator: DiskHealthIndicator,
    private readonly httpHealthIndicator: HttpHealthIndicator,
    private readonly queueHealthIndicator: QueueHealthIndicator,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    @Optional() private readonly apmService?: ApmService,
    @Optional() private readonly cacheOptimization?: CacheOptimizationService,
    @Optional() private readonly databaseOptimization?: DatabaseOptimizationService,
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

    this.dependencyHealthGauge = new Gauge({
      name: 'dependency_health_status',
      help: 'Dependency health status (1 = healthy, 0.5 = degraded, 0 = unhealthy)',
      labelNames: ['dependency'],
      registers: [this.registry],
    });

    this.healthAlertCounter = new Counter({
      name: 'health_alerts_total',
      help: 'Total number of health alerts by dependency and severity',
      labelNames: ['dependency', 'severity'],
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

    // Initialize dependency tracking
    this.initializeDependencies();
    
    // Start scheduled health checks
    this.startScheduledHealthChecks();
  }

  /**
   * Initialize dependency tracking
   */
  private initializeDependencies(): void {
    const dependencies = [
      'database',
      'redis',
      'email_service',
      'stripe',
      'paypal',
      'storage',
    ];

    dependencies.forEach((dep) => {
      this.dependencyHealthStatus.set(dep, {
        status: 'healthy',
        lastCheck: new Date(),
        latency: 0,
        consecutiveFailures: 0,
      });
    });
  }

  /**
   * Start scheduled health checks for all dependencies
   */
  private startScheduledHealthChecks(): void {
    // Run comprehensive health check every 30 seconds
    const intervalName = 'dependency-health-check';
    const interval = setInterval(() => {
      this.checkAllDependencies().catch((error) => {
        this.logger.error('Scheduled dependency health check failed:', error);
      });
    }, 30000); // 30 seconds

    this.schedulerRegistry.addInterval(intervalName, interval);
  }

  /**
   * Check health of all dependencies
   */
  private async checkAllDependencies(): Promise<void> {
    await Promise.all([
      this.checkDatabaseHealth(),
      this.checkRedisHealth(),
      this.checkEmailServiceHealth(),
      this.checkStripeHealth(),
      this.checkPayPalHealth(),
      this.checkStorageHealth(),
    ]);
  }

  async check() {
    this.healthCheckCounter.inc({ type: 'full' });
    const startTime = Date.now();

    try {
      const healthResult: HealthCheckResult = await this.healthCheckService.check([
        () => this.checkMemoryHealth(),
        () => this.checkDiskHealth(),
        () => this.checkApplicationHealth(),
        () => this.queueHealthIndicator.isHealthy('queue'),
        () => this.checkDatabaseHealth(),
        () => this.checkRedisHealth(),
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
    const [fullCheck, readiness, liveness, performanceMetrics] = await Promise.allSettled([
      this.check(),
      this.readiness().catch((err) => ({ status: 'error', message: err.message })),
      this.liveness(),
      this.getPerformanceMetrics(),
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
      performance: this.getSettledResult(performanceMetrics),
      metrics: {
        hasMetrics: true,
        endpoint: '/health/metrics',
      },
    };
  }

  /**
   * Get performance metrics if monitoring module is available
   */
  private async getPerformanceMetrics(): Promise<any> {
    if (!this.apmService || !this.cacheOptimization || !this.databaseOptimization) {
      return {
        available: false,
        message: 'Performance monitoring not available',
      };
    }

    try {
      const [currentMetrics, cacheMetrics, dbStats] = await Promise.all([
        this.apmService.getCurrentMetrics(),
        this.cacheOptimization.getCacheMetrics(),
        this.databaseOptimization.getOptimizationStats(),
      ]);

      return {
        available: true,
        apm: {
          activeTransactions: currentMetrics.activeTransactions,
          averageResponseTime: Math.round(currentMetrics.averageResponseTime),
          errorRate: Math.round(currentMetrics.errorRate * 100) / 100,
          throughput: Math.round(currentMetrics.throughput * 100) / 100,
          memoryUsage: Math.round(currentMetrics.memoryUsage * 100) / 100,
          cpuUsage: Math.round(currentMetrics.cpuUsage * 100) / 100,
        },
        cache: {
          hitRate: Math.round(cacheMetrics.overall.hitRate * 100) / 100,
          totalHits: cacheMetrics.overall.hits,
          totalMisses: cacheMetrics.overall.misses,
          layers: this.cacheOptimization.getCacheLayers(),
        },
        database: {
          pendingOptimizations: dbStats.pending,
          appliedOptimizations: dbStats.applied,
          averageImprovement: Math.round(dbStats.averageImprovement * 100) / 100,
        },
      };
    } catch (error) {
      this.logger.warn(`Failed to get performance metrics: ${error.message}`);
      return {
        available: false,
        error: error.message,
      };
    }
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

  /**
   * Database health check
   */
  async checkDatabaseHealth(): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    const dependencyName = 'database';

    try {
      // Execute a simple query to check database connectivity
      await this.dataSource.query('SELECT 1');
      
      const latency = Date.now() - startTime;
      this.updateDependencyHealth(dependencyName, 'healthy', latency);
      
      return {
        database: {
          status: 'up',
          latency: `${latency}ms`,
          type: this.dataSource.options.type,
          host: (this.dataSource.options as any).host || 'localhost',
          database: (this.dataSource.options as any).database || 'unknown',
        },
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error.message);
      this.updateDependencyHealth(dependencyName, 'unhealthy', 0, error.message);
      this.sendAlert(dependencyName, 'critical', `Database health check failed: ${error.message}`);
      
      return {
        database: {
          status: 'down',
          error: error.message,
        },
      };
    }
  }

  /**
   * Redis health check
   */
  async checkRedisHealth(): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    const dependencyName = 'redis';

    try {
      // Ping Redis to check connectivity
      const result = await this.redisService.ping();
      const latency = Date.now() - startTime;

      if (result === 'PONG') {
        this.updateDependencyHealth(dependencyName, 'healthy', latency);
        
        return {
          redis: {
            status: 'up',
            latency: `${latency}ms`,
            response: result,
            isConnected: this.redisService.isConnected(),
          },
        };
      } else {
        throw new Error('Redis did not respond with PONG');
      }
    } catch (error) {
      this.logger.error('Redis health check failed:', error.message);
      this.updateDependencyHealth(dependencyName, 'unhealthy', 0, error.message);
      this.sendAlert(dependencyName, 'critical', `Redis health check failed: ${error.message}`);
      
      return {
        redis: {
          status: 'down',
          error: error.message,
        },
      };
    }
  }

  /**
   * Email service health check
   */
  async checkEmailServiceHealth(): Promise<HealthIndicatorResult> {
    const dependencyName = 'email_service';

    try {
      // Check if email configuration is available
      const smtpHost = this.configService.get<string>('SMTP_HOST');
      const smtpPort = this.configService.get<number>('SMTP_PORT');

      if (!smtpHost || !smtpPort) {
        throw new Error('Email service configuration missing');
      }

      // Simple validation - in production, could test SMTP connection
      this.updateDependencyHealth(dependencyName, 'healthy', 0);
      
      return {
        email_service: {
          status: 'up',
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          configured: true,
        },
      };
    } catch (error) {
      this.logger.error('Email service health check failed:', error.message);
      this.updateDependencyHealth(dependencyName, 'degraded', 0, error.message);
      this.sendAlert(dependencyName, 'warning', `Email service health check warning: ${error.message}`);
      
      return {
        email_service: {
          status: 'down',
          error: error.message,
        },
      };
    }
  }

  /**
   * Stripe health check
   */
  async checkStripeHealth(): Promise<HealthIndicatorResult> {
    const dependencyName = 'stripe';

    try {
      const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
      
      if (!stripeKey) {
        throw new Error('Stripe API key not configured');
      }

      // Check if Stripe key is present and valid format
      if (!stripeKey.startsWith('sk_')) {
        throw new Error('Invalid Stripe API key format');
      }

      this.updateDependencyHealth(dependencyName, 'healthy', 0);
      
      return {
        stripe: {
          status: 'up',
          configured: true,
          environment: stripeKey.startsWith('sk_test_') ? 'test' : 'live',
        },
      };
    } catch (error) {
      this.logger.error('Stripe health check failed:', error.message);
      this.updateDependencyHealth(dependencyName, 'degraded', 0, error.message);
      this.sendAlert(dependencyName, 'warning', `Stripe health check warning: ${error.message}`);
      
      return {
        stripe: {
          status: 'down',
          error: error.message,
        },
      };
    }
  }

  /**
   * PayPal health check
   */
  async checkPayPalHealth(): Promise<HealthIndicatorResult> {
    const dependencyName = 'paypal';

    try {
      const paypalClientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
      const paypalSecret = this.configService.get<string>('PAYPAL_SECRET');
      
      if (!paypalClientId || !paypalSecret) {
        throw new Error('PayPal credentials not configured');
      }

      this.updateDependencyHealth(dependencyName, 'healthy', 0);
      
      return {
        paypal: {
          status: 'up',
          configured: true,
          environment: this.configService.get<string>('PAYPAL_MODE') || 'sandbox',
        },
      };
    } catch (error) {
      this.logger.error('PayPal health check failed:', error.message);
      this.updateDependencyHealth(dependencyName, 'degraded', 0, error.message);
      this.sendAlert(dependencyName, 'warning', `PayPal health check warning: ${error.message}`);
      
      return {
        paypal: {
          status: 'down',
          error: error.message,
        },
      };
    }
  }

  /**
   * Storage service health check
   */
  async checkStorageHealth(): Promise<HealthIndicatorResult> {
    const dependencyName = 'storage';

    try {
      const storageProvider = this.configService.get<string>('STORAGE_PROVIDER') || 'local';
      const bucketName = this.configService.get<string>('STORAGE_BUCKET');

      // For cloud providers, check configuration
      if (['aws-s3', 'gcs', 'azure'].includes(storageProvider.toLowerCase())) {
        if (!bucketName) {
          throw new Error(`Storage bucket not configured for ${storageProvider}`);
        }
      }

      this.updateDependencyHealth(dependencyName, 'healthy', 0);
      
      return {
        storage: {
          status: 'up',
          provider: storageProvider,
          bucket: bucketName || 'local-storage',
          configured: true,
        },
      };
    } catch (error) {
      this.logger.error('Storage health check failed:', error.message);
      this.updateDependencyHealth(dependencyName, 'degraded', 0, error.message);
      this.sendAlert(dependencyName, 'warning', `Storage health check warning: ${error.message}`);
      
      return {
        storage: {
          status: 'down',
          error: error.message,
        },
      };
    }
  }

  /**
   * Update dependency health status
   */
  private updateDependencyHealth(
    dependency: string,
    status: 'healthy' | 'degraded' | 'unhealthy',
    latency: number,
    error?: string,
  ): void {
    const currentStatus = this.dependencyHealthStatus.get(dependency) || {
      status: 'healthy',
      lastCheck: new Date(),
      latency: 0,
      consecutiveFailures: 0,
    };

    const consecutiveFailures = status === 'unhealthy' 
      ? currentStatus.consecutiveFailures + 1 
      : 0;

    this.dependencyHealthStatus.set(dependency, {
      status,
      lastCheck: new Date(),
      latency,
      error,
      consecutiveFailures,
    });

    // Update metrics gauge
    const gaugeValue = status === 'healthy' ? 1 : status === 'degraded' ? 0.5 : 0;
    this.dependencyHealthGauge.set({ dependency }, gaugeValue);

    // Check if alert threshold exceeded
    if (consecutiveFailures >= this.alertThresholds.consecutiveFailures && status === 'unhealthy') {
      this.sendAlert(dependency, 'critical', `Dependency ${dependency} has failed ${consecutiveFailures} consecutive health checks`);
    }
  }

  /**
   * Send health alert
   */
  private sendAlert(
    dependency: string,
    severity: 'warning' | 'critical',
    message: string,
  ): void {
    this.logger.warn(`[${severity.toUpperCase()}] ${dependency}: ${message}`);
    
    // Increment alert counter for monitoring
    this.healthAlertCounter.inc({ dependency, severity });

    // In production, integrate with alerting systems (PagerDuty, Slack, etc.)
    // Example: await this.alertingService.sendAlert({ dependency, severity, message });
  }

  /**
   * Get dependency health status
   */
  getDependencyHealthStatus() {
    const status: Record<string, any> = {};
    
    this.dependencyHealthStatus.forEach((value, key) => {
      status[key] = {
        ...value,
        lastCheck: value.lastCheck.toISOString(),
      };
    });

    return status;
  }

  /**
   * Get overall system health summary
   */
  getOverallHealthSummary() {
    let healthyCount = 0;
    let degradedCount = 0;
    let unhealthyCount = 0;

    this.dependencyHealthStatus.forEach((value) => {
      if (value.status === 'healthy') healthyCount++;
      else if (value.status === 'degraded') degradedCount++;
      else unhealthyCount++;
    });

    const total = this.dependencyHealthStatus.size;
    const healthScore = ((healthyCount + (degradedCount * 0.5)) / total) * 100;

    return {
      overall: healthScore >= 90 ? 'healthy' : healthScore >= 50 ? 'degraded' : 'unhealthy',
      healthScore: healthScore.toFixed(2),
      dependencies: {
        healthy: healthyCount,
        degraded: degradedCount,
        unhealthy: unhealthyCount,
        total,
      },
      details: this.getDependencyHealthStatus(),
    };
  }
}
