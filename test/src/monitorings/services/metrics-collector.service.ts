import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetricData, ObservabilityMetrics, SystemMetrics, ApplicationMetrics } from '../interfaces/observability.interface';
import { MonitoringConfig } from '../interfaces/monitoring-config.interface';
import * as os from 'os';
import * as process from 'process';

@Injectable()
export class MetricsCollectorService {
  private readonly logger = new Logger(MetricsCollectorService.name);
  private metrics: MetricData[] = [];
  private requestCounts = new Map<string, number>();
  private responseTimes: number[] = [];
  private errorCounts = new Map<string, number>();

  constructor(private readonly config: MonitoringConfig) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async collectSystemMetrics(): Promise<void> {
    if (!this.config.enableMetrics) return;

    try {
      const systemMetrics = await this.getSystemMetrics();
      const applicationMetrics = await this.getApplicationMetrics();

      // Store system metrics
      this.storeMetric('cpu_usage', systemMetrics.cpuUsage, { type: 'system' });
      this.storeMetric('memory_usage', systemMetrics.memoryUsage, { type: 'system' });
      this.storeMetric('disk_usage', systemMetrics.diskUsage, { type: 'system' });
      this.storeMetric('uptime', systemMetrics.uptime, { type: 'system' });

      // Store application metrics
      this.storeMetric('request_count', applicationMetrics.requestCount, { type: 'application' });
      this.storeMetric('response_time_avg', applicationMetrics.responseTime.average, { type: 'application' });
      this.storeMetric('error_rate', applicationMetrics.errorRate, { type: 'application' });
      this.storeMetric('active_connections', applicationMetrics.activeConnections, { type: 'application' });

      this.logger.debug('System and application metrics collected successfully');
    } catch (error) {
      this.logger.error('Failed to collect metrics', error.stack);
    }
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Calculate CPU usage
    const cpuUsage = await this.calculateCpuUsage();

    return {
      cpuUsage,
      memoryUsage: (usedMem / totalMem) * 100,
      diskUsage: await this.getDiskUsage(),
      networkIO: {
        bytesIn: 0, // Would need platform-specific implementation
        bytesOut: 0,
        packetsIn: 0,
        packetsOut: 0
      },
      uptime: os.uptime()
    };
  }

  private async getApplicationMetrics(): Promise<ApplicationMetrics> {
    const memUsage = process.memoryUsage();
    
    return {
      requestCount: this.getTotalRequestCount(),
      responseTime: this.calculateResponseTimeMetrics(),
      errorRate: this.calculateErrorRate(),
      activeConnections: 0, // Would need to track active connections
      throughput: this.calculateThroughput()
    };
  }

  private async calculateCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = endUsage.user + endUsage.system;
        const cpuPercent = (totalUsage / 1000000) * 100; // Convert to percentage
        resolve(Math.min(cpuPercent, 100));
      }, 100);
    });
  }

  private async getDiskUsage(): Promise<number> {
    // Simplified disk usage calculation
    // In production, you'd want to use a proper disk usage library
    return 0;
  }

  private getTotalRequestCount(): number {
    return Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0);
  }

  private calculateResponseTimeMetrics() {
    if (this.responseTimes.length === 0) {
      return { average: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0 };
    }

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      average: this.responseTimes.reduce((sum, time) => sum + time, 0) / len,
      p50: sorted[Math.floor(len * 0.5)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)],
      min: sorted[0],
      max: sorted[len - 1]
    };
  }

  private calculateErrorRate(): number {
    const totalRequests = this.getTotalRequestCount();
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  }

  private calculateThroughput(): number {
    // Calculate requests per second over the last minute
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentMetrics = this.metrics.filter(
      metric => metric.timestamp.getTime() > oneMinuteAgo && metric.metricName === 'request_count'
    );
    
    return recentMetrics.length > 0 ? recentMetrics[recentMetrics.length - 1].value / 60 : 0;
  }

  private storeMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: MetricData = {
      timestamp: new Date(),
      metricName: name,
      value,
      tags,
      unit: this.getMetricUnit(name)
    };

    this.metrics.push(metric);
    
    // Keep only recent metrics (last hour)
    const oneHourAgo = Date.now() - 3600000;
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > oneHourAgo);
  }

  private getMetricUnit(metricName: string): string {
    const unitMap: Record<string, string> = {
      'cpu_usage': '%',
      'memory_usage': '%',
      'disk_usage': '%',
      'response_time_avg': 'ms',
      'error_rate': '%',
      'uptime': 's',
      'request_count': 'count',
      'active_connections': 'count'
    };
    return unitMap[metricName] || 'count';
  }

  // Public methods for recording custom metrics
  recordRequest(endpoint: string): void {
    const current = this.requestCounts.get(endpoint) || 0;
    this.requestCounts.set(endpoint, current + 1);
  }

  recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
    
    // Keep only recent response times (last 1000 requests)
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  recordError(errorType: string): void {
    const current = this.errorCounts.get(errorType) || 0;
    this.errorCounts.set(errorType, current + 1);
  }

  getMetrics(since?: Date): MetricData[] {
    if (!since) return [...this.metrics];
    return this.metrics.filter(m => m.timestamp >= since);
  }

  getMetricsByName(name: string, since?: Date): MetricData[] {
    return this.getMetrics(since).filter(m => m.metricName === name);
  }
}
