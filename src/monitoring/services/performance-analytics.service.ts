import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PerformanceMetric, MetricType } from '../entities/performance-metric.entity';
import { PerformanceReport, ReportType } from '../entities/performance-report.entity';
import { ApmService } from './apm.service';
import { CacheOptimizationService } from './cache-optimization.service';
import { DatabaseOptimizationService } from './database-optimization.service';

export interface AnalyticsTimeSeries {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface PerformanceDashboard {
  overview: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
    activeUsers: number;
  };
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    average: number;
  };
  cache: {
    hitRate: number;
    totalHits: number;
    totalMisses: number;
  };
  database: {
    averageQueryTime: number;
    slowQueries: number;
    pendingOptimizations: number;
  };
  system: {
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
  trends: {
    responseTime: AnalyticsTimeSeries[];
    errorRate: AnalyticsTimeSeries[];
    throughput: AnalyticsTimeSeries[];
  };
}

@Injectable()
export class PerformanceAnalyticsService {
  private readonly logger = new Logger(PerformanceAnalyticsService.name);

  constructor(
    @InjectRepository(PerformanceMetric)
    private metricRepository: Repository<PerformanceMetric>,
    @InjectRepository(PerformanceReport)
    private reportRepository: Repository<PerformanceReport>,
    private apmService: ApmService,
    private cacheOptimization: CacheOptimizationService,
    private databaseOptimization: DatabaseOptimizationService,
  ) {}

  /**
   * Get performance dashboard data
   */
  async getDashboard(timeRange: { start: Date; end: Date }): Promise<PerformanceDashboard> {
    const [metrics, currentMetrics, cacheMetrics, dbStats] = await Promise.all([
      this.getMetricsInRange(timeRange),
      this.apmService.getCurrentMetrics(),
      this.cacheOptimization.getCacheMetrics(),
      this.databaseOptimization.getOptimizationStats(),
    ]);

    const httpMetrics = metrics.filter((m) => m.type === MetricType.HTTP_REQUEST);
    const durations = httpMetrics.map((m) => m.duration).sort((a, b) => a - b);
    const errors = httpMetrics.filter((m) => m.statusCode && m.statusCode >= 400);

    const totalRequests = httpMetrics.length;
    const averageResponseTime =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const errorRate = totalRequests > 0 ? (errors.length / totalRequests) * 100 : 0;

    const timeSpan = (timeRange.end.getTime() - timeRange.start.getTime()) / 1000; // seconds
    const throughput = timeSpan > 0 ? totalRequests / timeSpan : 0;

    return {
      overview: {
        totalRequests,
        averageResponseTime: Math.round(averageResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        throughput: Math.round(throughput * 100) / 100,
        activeUsers: 0, // Would need user tracking
      },
      responseTime: {
        p50: durations.length > 0 ? durations[Math.floor(durations.length * 0.5)] : 0,
        p95: durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0,
        p99: durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0,
        average: averageResponseTime,
      },
      cache: {
        hitRate: cacheMetrics.overall.hitRate,
        totalHits: cacheMetrics.overall.hits,
        totalMisses: cacheMetrics.overall.misses,
      },
      database: {
        averageQueryTime: 0, // Would need database metrics
        slowQueries: dbStats.pending,
        pendingOptimizations: dbStats.pending,
      },
      system: {
        memoryUsage: currentMetrics.memoryUsage,
        cpuUsage: currentMetrics.cpuUsage,
        activeConnections: currentMetrics.activeTransactions,
      },
      trends: {
        responseTime: this.generateTimeSeries(metrics, 'duration', timeRange),
        errorRate: this.generateErrorRateSeries(metrics, timeRange),
        throughput: this.generateThroughputSeries(metrics, timeRange),
      },
    };
  }

  /**
   * Get metrics in time range
   */
  private async getMetricsInRange(timeRange: { start: Date; end: Date }): Promise<PerformanceMetric[]> {
    return this.metricRepository.find({
      where: {
        timestamp: Between(timeRange.start, timeRange.end),
      },
      order: { timestamp: 'ASC' },
    });
  }

  /**
   * Generate time series data
   */
  private generateTimeSeries(
    metrics: PerformanceMetric[],
    field: keyof PerformanceMetric,
    timeRange: { start: Date; end: Date },
    intervalMinutes: number = 5,
  ): AnalyticsTimeSeries[] {
    const series: AnalyticsTimeSeries[] = [];
    const interval = intervalMinutes * 60 * 1000; // milliseconds
    let currentTime = timeRange.start.getTime();

    while (currentTime <= timeRange.end.getTime()) {
      const nextTime = currentTime + interval;
      const windowMetrics = metrics.filter(
        (m) => m.timestamp.getTime() >= currentTime && m.timestamp.getTime() < nextTime,
      );

      if (windowMetrics.length > 0) {
        const values = windowMetrics.map((m) => (m[field] as number) || 0);
        const average = values.reduce((a, b) => a + b, 0) / values.length;

        series.push({
          timestamp: new Date(currentTime),
          value: Math.round(average),
        });
      }

      currentTime = nextTime;
    }

    return series;
  }

  /**
   * Generate error rate time series
   */
  private generateErrorRateSeries(
    metrics: PerformanceMetric[],
    timeRange: { start: Date; end: Date },
    intervalMinutes: number = 5,
  ): AnalyticsTimeSeries[] {
    const series: AnalyticsTimeSeries[] = [];
    const interval = intervalMinutes * 60 * 1000;
    let currentTime = timeRange.start.getTime();

    while (currentTime <= timeRange.end.getTime()) {
      const nextTime = currentTime + interval;
      const windowMetrics = metrics.filter(
        (m) => m.timestamp.getTime() >= currentTime && m.timestamp.getTime() < nextTime,
      );

      if (windowMetrics.length > 0) {
        const errors = windowMetrics.filter((m) => m.statusCode && m.statusCode >= 400).length;
        const errorRate = (errors / windowMetrics.length) * 100;

        series.push({
          timestamp: new Date(currentTime),
          value: Math.round(errorRate * 100) / 100,
        });
      }

      currentTime = nextTime;
    }

    return series;
  }

  /**
   * Generate throughput time series
   */
  private generateThroughputSeries(
    metrics: PerformanceMetric[],
    timeRange: { start: Date; end: Date },
    intervalMinutes: number = 5,
  ): AnalyticsTimeSeries[] {
    const series: AnalyticsTimeSeries[] = [];
    const interval = intervalMinutes * 60 * 1000;
    let currentTime = timeRange.start.getTime();

    while (currentTime <= timeRange.end.getTime()) {
      const nextTime = currentTime + interval;
      const windowMetrics = metrics.filter(
        (m) => m.timestamp.getTime() >= currentTime && m.timestamp.getTime() < nextTime,
      );

      if (windowMetrics.length > 0) {
        const intervalSeconds = interval / 1000;
        const throughput = windowMetrics.length / intervalSeconds;

        series.push({
          timestamp: new Date(currentTime),
          value: Math.round(throughput * 100) / 100,
        });
      }

      currentTime = nextTime;
    }

    return series;
  }

  /**
   * Get endpoint performance breakdown
   */
  async getEndpointPerformance(timeRange: { start: Date; end: Date }): Promise<
    Array<{
      endpoint: string;
      method: string;
      count: number;
      averageDuration: number;
      p95: number;
      errorRate: number;
    }>
  > {
    const metrics = await this.getMetricsInRange(timeRange);
    const httpMetrics = metrics.filter((m) => m.type === MetricType.HTTP_REQUEST && m.endpoint);

    const endpointMap = new Map<string, PerformanceMetric[]>();

    httpMetrics.forEach((metric) => {
      const key = `${metric.method || 'UNKNOWN'}:${metric.endpoint}`;
      if (!endpointMap.has(key)) {
        endpointMap.set(key, []);
      }
      endpointMap.get(key)!.push(metric);
    });

    const results: Array<{
      endpoint: string;
      method: string;
      count: number;
      averageDuration: number;
      p95: number;
      errorRate: number;
    }> = [];

    endpointMap.forEach((endpointMetrics, key) => {
      const [method, endpoint] = key.split(':');
      const durations = endpointMetrics.map((m) => m.duration).sort((a, b) => a - b);
      const errors = endpointMetrics.filter((m) => m.statusCode && m.statusCode >= 400).length;

      results.push({
        endpoint,
        method,
        count: endpointMetrics.length,
        averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        p95: durations[Math.floor(durations.length * 0.95)],
        errorRate: (errors / endpointMetrics.length) * 100,
      });
    });

    return results.sort((a, b) => b.averageDuration - a.averageDuration);
  }

  /**
   * Get performance reports
   */
  async getReports(limit: number = 20): Promise<PerformanceReport[]> {
    return this.reportRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get report by ID
   */
  async getReport(reportId: string): Promise<PerformanceReport | null> {
    return this.reportRepository.findOne({ where: { id: reportId } });
  }
}
