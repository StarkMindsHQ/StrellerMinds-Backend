import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricsService } from './metrics-service';
import { AlertingService } from './alerting-service';

export interface PerformanceMetric {
  id?: string;
  timestamp: Date;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  errorRate: number;
}

export interface PerformanceThresholds {
  responseTime: {
    warning: number;
    critical: number;
  };
  memoryUsage: {
    warning: number;
    critical: number;
  };
  errorRate: {
    warning: number;
    critical: number;
  };
  throughput: {
    minimum: number;
  };
}

@Injectable()
export class PerformanceMonitoringService {
  private readonly logger = new Logger(PerformanceMonitoringService.name);
  private performanceHistory: PerformanceMetric[] = [];
  private readonly maxHistorySize = 10000;
  
  private readonly thresholds: PerformanceThresholds = {
    responseTime: {
      warning: 1000, // 1 second
      critical: 2000, // 2 seconds
    },
    memoryUsage: {
      warning: 70, // 70%
      critical: 85, // 85%
    },
    errorRate: {
      warning: 1, // 1%
      critical: 5, // 5%
    },
    throughput: {
      minimum: 100, // requests per second
    },
  };

  constructor(
    private readonly metricsService: MetricsService,
    private readonly alertingService: AlertingService,
  ) {}

  /**
   * Record performance metrics for an endpoint
   */
  recordEndpointPerformance(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
  ): void {
    const memoryUsage = this.getCurrentMemoryUsage();
    const cpuUsage = this.getCurrentCpuUsage();
    const activeConnections = this.getActiveConnections();
    const errorRate = this.calculateCurrentErrorRate();

    const metric: PerformanceMetric = {
      timestamp: new Date(),
      endpoint,
      method,
      responseTime,
      statusCode,
      memoryUsage,
      cpuUsage,
      activeConnections,
      errorRate,
    };

    // Store in memory (consider using Redis for production)
    this.performanceHistory.push(metric);
    
    // Maintain history size
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory = this.performanceHistory.slice(-this.maxHistorySize);
    }

    // Update Prometheus metrics
    this.metricsService.recordHttpRequestDuration(
      method,
      endpoint,
      statusCode.toString(),
      responseTime,
    );

    // Check thresholds and trigger alerts if needed
    this.checkPerformanceThresholds(metric);

    this.logger.debug(
      `Performance recorded: ${method} ${endpoint} - ${responseTime}ms - ${statusCode}`,
    );
  }

  /**
   * Get performance statistics for a specific endpoint
   */
  getEndpointPerformanceStats(endpoint: string, timeWindow: number = 3600000): any {
    const cutoffTime = new Date(Date.now() - timeWindow);
    const relevantMetrics = this.performanceHistory.filter(
      (metric) => metric.endpoint === endpoint && metric.timestamp >= cutoffTime,
    );

    if (relevantMetrics.length === 0) {
      return null;
    }

    const responseTimes = relevantMetrics.map((m) => m.responseTime);
    const errorCount = relevantMetrics.filter((m) => m.statusCode >= 400).length;

    return {
      endpoint,
      timeWindow: timeWindow / 1000, // Convert to seconds
      totalRequests: relevantMetrics.length,
      averageResponseTime: this.calculateAverage(responseTimes),
      medianResponseTime: this.calculateMedian(responseTimes),
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(responseTimes, 99),
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      errorRate: (errorCount / relevantMetrics.length) * 100,
      throughput: relevantMetrics.length / (timeWindow / 1000),
      statusCodeDistribution: this.calculateStatusCodeDistribution(relevantMetrics),
    };
  }

  /**
   * Get overall system performance summary
   */
  getSystemPerformanceSummary(timeWindow: number = 3600000): any {
    const cutoffTime = new Date(Date.now() - timeWindow);
    const relevantMetrics = this.performanceHistory.filter(
      (metric) => metric.timestamp >= cutoffTime,
    );

    if (relevantMetrics.length === 0) {
      return {
        message: 'No performance data available for the specified time window',
        timeWindow: timeWindow / 1000,
      };
    }

    const responseTimes = relevantMetrics.map((m) => m.responseTime);
    const memoryUsages = relevantMetrics.map((m) => m.memoryUsage);
    const errorCount = relevantMetrics.filter((m) => m.statusCode >= 400).length;

    // Group by endpoint for detailed breakdown
    const endpointGroups = this.groupMetricsByEndpoint(relevantMetrics);
    const endpointStats = Object.keys(endpointGroups).map((endpoint) => ({
      endpoint,
      requestCount: endpointGroups[endpoint].length,
      avgResponseTime: this.calculateAverage(
        endpointGroups[endpoint].map((m) => m.responseTime),
      ),
      errorRate: (endpointGroups[endpoint].filter((m) => m.statusCode >= 400).length /
        endpointGroups[endpoint].length) * 100,
    }));

    return {
      timeWindow: timeWindow / 1000,
      totalRequests: relevantMetrics.length,
      overallPerformance: {
        averageResponseTime: this.calculateAverage(responseTimes),
        medianResponseTime: this.calculateMedian(responseTimes),
        p95ResponseTime: this.calculatePercentile(responseTimes, 95),
        p99ResponseTime: this.calculatePercentile(responseTimes, 99),
        overallErrorRate: (errorCount / relevantMetrics.length) * 100,
        averageMemoryUsage: this.calculateAverage(memoryUsages),
        throughput: relevantMetrics.length / (timeWindow / 1000),
      },
      endpointBreakdown: endpointStats.sort((a, b) => b.requestCount - a.requestCount),
      performanceGrade: this.calculatePerformanceGrade(relevantMetrics),
      recommendations: this.generatePerformanceRecommendations(relevantMetrics),
    };
  }

  /**
   * Scheduled performance analysis
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async performScheduledAnalysis(): Promise<void> {
    try {
      this.logger.debug('Running scheduled performance analysis');
      
      const summary = this.getSystemPerformanceSummary(300000); // Last 5 minutes
      
      // Check for performance degradation
      await this.checkPerformanceDegradation(summary);
      
      // Update performance metrics
      this.updateAggregatedMetrics(summary);
      
      this.logger.debug('Scheduled performance analysis completed');
    } catch (error) {
      this.logger.error('Error in scheduled performance analysis:', error);
    }
  }

  /**
   * Check performance thresholds and trigger alerts
   */
  private checkPerformanceThresholds(metric: PerformanceMetric): void {
    // Response time alerts
    if (metric.responseTime > this.thresholds.responseTime.critical) {
      this.alertingService.sendAlert('CRITICAL_RESPONSE_TIME', {
        endpoint: metric.endpoint,
        method: metric.method,
        responseTime: metric.responseTime,
        threshold: this.thresholds.responseTime.critical,
        timestamp: metric.timestamp,
      });
    } else if (metric.responseTime > this.thresholds.responseTime.warning) {
      this.alertingService.sendAlert('WARNING_RESPONSE_TIME', {
        endpoint: metric.endpoint,
        method: metric.method,
        responseTime: metric.responseTime,
        threshold: this.thresholds.responseTime.warning,
        timestamp: metric.timestamp,
      });
    }

    // Memory usage alerts
    if (metric.memoryUsage > this.thresholds.memoryUsage.critical) {
      this.alertingService.sendAlert('CRITICAL_MEMORY_USAGE', {
        memoryUsage: metric.memoryUsage,
        threshold: this.thresholds.memoryUsage.critical,
        timestamp: metric.timestamp,
      });
    } else if (metric.memoryUsage > this.thresholds.memoryUsage.warning) {
      this.alertingService.sendAlert('WARNING_MEMORY_USAGE', {
        memoryUsage: metric.memoryUsage,
        threshold: this.thresholds.memoryUsage.warning,
        timestamp: metric.timestamp,
      });
    }

    // Error rate alerts
    if (metric.errorRate > this.thresholds.errorRate.critical) {
      this.alertingService.sendAlert('CRITICAL_ERROR_RATE', {
        errorRate: metric.errorRate,
        threshold: this.thresholds.errorRate.critical,
        timestamp: metric.timestamp,
      });
    }
  }

  /**
   * Check for performance degradation trends
   */
  private async checkPerformanceDegradation(summary: any): Promise<void> {
    if (!summary.overallPerformance) return;

    const { overallPerformance } = summary;
    
    // Compare with historical averages (simplified)
    const historicalAvg = this.calculateHistoricalAverage();
    
    if (historicalAvg && overallPerformance.averageResponseTime > historicalAvg * 1.5) {
      await this.alertingService.sendAlert('PERFORMANCE_DEGRADATION', {
        currentAvg: overallPerformance.averageResponseTime,
        historicalAvg,
        degradationPercent: ((overallPerformance.averageResponseTime - historicalAvg) / historicalAvg) * 100,
        timestamp: new Date(),
      });
    }
  }

  // Helper methods
  private getCurrentMemoryUsage(): number {
    const usage = process.memoryUsage();
    return (usage.heapUsed / usage.heapTotal) * 100;
  }

  private getCurrentCpuUsage(): number {
    // Simplified CPU usage calculation
    const usage = process.cpuUsage();
    return (usage.user + usage.system) / 1000000; // Convert to seconds
  }

  private getActiveConnections(): number {
    // This would typically come from your database connection pool
    // For now, return a placeholder
    return 0;
  }

  private calculateCurrentErrorRate(): number {
    const recentMetrics = this.performanceHistory.slice(-100); // Last 100 requests
    if (recentMetrics.length === 0) return 0;
    
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    return (errorCount / recentMetrics.length) * 100;
  }

  private calculateAverage(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = numbers.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];
  }

  private calculatePercentile(numbers: number[], percentile: number): number {
    const sorted = numbers.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  private calculateStatusCodeDistribution(metrics: PerformanceMetric[]): any {
    const distribution = {};
    metrics.forEach(metric => {
      const code = metric.statusCode.toString();
      distribution[code] = (distribution[code] || 0) + 1;
    });
    return distribution;
  }

  private groupMetricsByEndpoint(metrics: PerformanceMetric[]): any {
    return metrics.reduce((groups, metric) => {
      const key = metric.endpoint;
      if (!groups[key]) groups[key] = [];
      groups[key].push(metric);
      return groups;
    }, {});
  }

  private calculatePerformanceGrade(metrics: PerformanceMetric[]): string {
    const avgResponseTime = this.calculateAverage(metrics.map(m => m.responseTime));
    const errorRate = (metrics.filter(m => m.statusCode >= 400).length / metrics.length) * 100;
    
    if (avgResponseTime < 500 && errorRate < 0.1) return 'A';
    if (avgResponseTime < 1000 && errorRate < 0.5) return 'B';
    if (avgResponseTime < 2000 && errorRate < 1) return 'C';
    if (avgResponseTime < 3000 && errorRate < 2) return 'D';
    return 'F';
  }

  private generatePerformanceRecommendations(metrics: PerformanceMetric[]): string[] {
    const recommendations = [];
    const avgResponseTime = this.calculateAverage(metrics.map(m => m.responseTime));
    const errorRate = (metrics.filter(m => m.statusCode >= 400).length / metrics.length) * 100;
    const avgMemoryUsage = this.calculateAverage(metrics.map(m => m.memoryUsage));
    
    if (avgResponseTime > 1000) {
      recommendations.push('Consider implementing caching to reduce response times');
      recommendations.push('Review database queries for optimization opportunities');
    }
    
    if (errorRate > 1) {
      recommendations.push('Investigate and fix sources of errors to improve reliability');
    }
    
    if (avgMemoryUsage > 70) {
      recommendations.push('Monitor memory usage and consider optimizing memory-intensive operations');
    }
    
    return recommendations;
  }

  private calculateHistoricalAverage(): number | null {
    if (this.performanceHistory.length < 100) return null;
    
    const historicalMetrics = this.performanceHistory.slice(0, -100); // Exclude recent metrics
    return this.calculateAverage(historicalMetrics.map(m => m.responseTime));
  }

  private updateAggregatedMetrics(summary: any): void {
    if (summary.overallPerformance) {
      // Update Prometheus metrics with aggregated data
      this.metricsService.updateErrorRate(summary.overallPerformance.overallErrorRate);
      // Add more metric updates as needed
    }
  }
}
