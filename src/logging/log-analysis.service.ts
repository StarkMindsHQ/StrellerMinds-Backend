import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { CorrelationLoggerService } from './correlation-logger.service';

/**
 * Log analysis result interface
 */
export interface LogAnalysisResult {
  summary: {
    totalLogs: number;
    timeRange: { start: Date; end: Date };
    errorRate: number;
    warningRate: number;
  };
  trends: {
    logsPerHour: Array<{ hour: string; count: number }>;
    errorsPerHour: Array<{ hour: string; count: number }>;
  };
  topCorrelations: Array<{ correlationId: string; count: number }>;
  topErrors: Array<{ message: string; count: number; stack?: string }>;
  performanceMetrics: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    slowestEndpoints: Array<{ endpoint: string; avgDuration: number }>;
  };
  anomalies: Array<{
    type: 'error_spike' | 'traffic_spike' | 'performance_degradation';
    timestamp: Date;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
}

/**
 * Service for analyzing log data
 */
@Injectable()
export class LogAnalysisService {
  private readonly elasticsearchClient?: Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly correlationLogger: CorrelationLoggerService,
  ) {
    const esNode = this.configService.get<string>('ELASTICSEARCH_NODE');
    
    if (esNode) {
      this.elasticsearchClient = new Client({
        node: esNode,
        auth: this.configService.get<string>('ELASTICSEARCH_AUTH')
          ? {
              username: this.configService.get<string>('ELASTICSEARCH_USERNAME'),
              password: this.configService.get<string>('ELASTICSEARCH_PASSWORD'),
            }
          : undefined,
      });
      
      this.correlationLogger.log('Log analysis service initialized with Elasticsearch');
    } else {
      this.correlationLogger.warn('Log analysis service initialized without Elasticsearch');
    }
  }

  /**
   * Analyze logs for a given time period
   */
  async analyzeLogs(timeRange: { start: Date; end: Date }): Promise<LogAnalysisResult> {
    if (!this.elasticsearchClient) {
      throw new Error('Elasticsearch not configured for log analysis');
    }

    const indexPattern = `${this.configService.get<string>('ELASTICSEARCH_LOG_INDEX', 'strellerminds-logs')}*`;

    // Get total logs and error/warning counts
    const [totalLogs, errorCount, warningCount] = await Promise.all([
      this.countLogs(indexPattern, timeRange),
      this.countLogsByLevel(indexPattern, timeRange, 'error'),
      this.countLogsByLevel(indexPattern, timeRange, 'warn'),
    ]);

    const errorRate = totalLogs > 0 ? (errorCount / totalLogs) * 100 : 0;
    const warningRate = totalLogs > 0 ? (warningCount / totalLogs) * 100 : 0;

    // Get trends
    const logsPerHour = await this.getLogsPerHour(indexPattern, timeRange);
    const errorsPerHour = await this.getErrorsPerHour(indexPattern, timeRange);

    // Get top correlations
    const topCorrelations = await this.getTopCorrelations(indexPattern, timeRange);

    // Get top errors
    const topErrors = await this.getTopErrors(indexPattern, timeRange);

    // Get performance metrics
    const performanceMetrics = await this.getPerformanceMetrics(indexPattern, timeRange);

    // Detect anomalies
    const anomalies = await this.detectAnomalies(logsPerHour, errorsPerHour, performanceMetrics);

    return {
      summary: {
        totalLogs,
        timeRange,
        errorRate: Math.round(errorRate * 100) / 100,
        warningRate: Math.round(warningRate * 100) / 100,
      },
      trends: {
        logsPerHour,
        errorsPerHour,
      },
      topCorrelations,
      topErrors,
      performanceMetrics,
      anomalies,
    };
  }

  /**
   * Count total logs in time range
   */
  private async countLogs(index: string, timeRange: { start: Date; end: Date }): Promise<number> {
    const response = await this.elasticsearchClient!.search({
      index,
      size: 0,
      body: {
        query: {
          range: {
            '@timestamp': {
              gte: timeRange.start.toISOString(),
              lte: timeRange.end.toISOString(),
            },
          },
        },
      },
    });

    return response.body.hits.total.value;
  }

  /**
   * Count logs by severity level
   */
  private async countLogsByLevel(
    index: string,
    timeRange: { start: Date; end: Date },
    level: string,
  ): Promise<number> {
    const response = await this.elasticsearchClient!.search({
      index,
      size: 0,
      body: {
        query: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: timeRange.start.toISOString(),
                    lte: timeRange.end.toISOString(),
                  },
                },
              },
              { term: { severity: level } },
            ],
          },
        },
      },
    });

    return response.body.hits.total.value;
  }

  /**
   * Get logs per hour aggregation
   */
  private async getLogsPerHour(
    index: string,
    timeRange: { start: Date; end: Date },
  ): Promise<Array<{ hour: string; count: number }>> {
    const response = await this.elasticsearchClient!.search({
      index,
      size: 0,
      body: {
        query: {
          range: {
            '@timestamp': {
              gte: timeRange.start.toISOString(),
              lte: timeRange.end.toISOString(),
            },
          },
        },
        aggs: {
          logs_over_time: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: 'hour',
            },
          },
        },
      },
    });

    return response.body.aggregations.logs_over_time.buckets.map((bucket: any) => ({
      hour: bucket.key_as_string,
      count: bucket.doc_count,
    }));
  }

  /**
   * Get errors per hour aggregation
   */
  private async getErrorsPerHour(
    index: string,
    timeRange: { start: Date; end: Date },
  ): Promise<Array<{ hour: string; count: number }>> {
    const response = await this.elasticsearchClient!.search({
      index,
      size: 0,
      body: {
        query: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: timeRange.start.toISOString(),
                    lte: timeRange.end.toISOString(),
                  },
                },
              },
              { term: { severity: 'error' } },
            ],
          },
        },
        aggs: {
          errors_over_time: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: 'hour',
            },
          },
        },
      },
    });

    return response.body.aggregations.errors_over_time.buckets.map((bucket: any) => ({
      hour: bucket.key_as_string,
      count: bucket.doc_count,
    }));
  }

  /**
   * Get top correlation IDs
   */
  private async getTopCorrelations(
    index: string,
    timeRange: { start: Date; end: Date },
  ): Promise<Array<{ correlationId: string; count: number }>> {
    const response = await this.elasticsearchClient!.search({
      index,
      size: 0,
      body: {
        query: {
          range: {
            '@timestamp': {
              gte: timeRange.start.toISOString(),
              lte: timeRange.end.toISOString(),
            },
          },
        },
        aggs: {
          by_correlation: {
            terms: {
              field: 'correlationId',
              size: 20,
            },
          },
        },
      },
    });

    return response.body.aggregations.by_correlation.buckets.map((bucket: any) => ({
      correlationId: bucket.key,
      count: bucket.doc_count,
    }));
  }

  /**
   * Get top error messages
   */
  private async getTopErrors(
    index: string,
    timeRange: { start: Date; end: Date },
  ): Promise<Array<{ message: string; count: number; stack?: string }>> {
    const response = await this.elasticsearchClient!.search({
      index,
      size: 0,
      body: {
        query: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: timeRange.start.toISOString(),
                    lte: timeRange.end.toISOString(),
                  },
                },
              },
              { term: { severity: 'error' } },
            ],
          },
        },
        aggs: {
          by_message: {
            terms: {
              field: 'message.keyword',
              size: 20,
            },
          },
        },
      },
    });

    return response.body.aggregations.by_message.buckets.map((bucket: any) => ({
      message: bucket.key,
      count: bucket.doc_count,
    }));
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(
    index: string,
    timeRange: { start: Date; end: Date },
  ): Promise<{
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    slowestEndpoints: Array<{ endpoint: string; avgDuration: number }>;
  }> {
    const response = await this.elasticsearchClient!.search({
      index,
      size: 0,
      body: {
        query: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: timeRange.start.toISOString(),
                    lte: timeRange.end.toISOString(),
                  },
                },
              },
              { exists: { field: 'durationMs' } },
            ],
          },
        },
        aggs: {
          avg_duration: { avg: { field: 'durationMs' } },
          p95_duration: {
            percentiles: {
              field: 'durationMs',
              percents: [95],
            },
          },
          p99_duration: {
            percentiles: {
              field: 'durationMs',
              percents: [99],
            },
          },
          by_endpoint: {
            terms: {
              field: 'url.keyword',
              size: 20,
            },
            aggs: {
              avg_duration: { avg: { field: 'durationMs' } },
            },
          },
        },
      },
    });

    const slowestEndpoints = response.body.aggregations.by_endpoint.buckets
      .map((bucket: any) => ({
        endpoint: bucket.key,
        avgDuration: bucket.avg_duration.value,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    return {
      averageResponseTime: Math.round(response.body.aggregations.avg_duration.value || 0),
      p95ResponseTime: Math.round(response.body.aggregations.p95_duration.values['95.0'] || 0),
      p99ResponseTime: Math.round(response.body.aggregations.p99_duration.values['99.0'] || 0),
      slowestEndpoints,
    };
  }

  /**
   * Detect anomalies in log patterns
   */
  private async detectAnomalies(
    logsPerHour: Array<{ hour: string; count: number }>,
    errorsPerHour: Array<{ hour: string; count: number }>,
    performanceMetrics: any,
  ): Promise<
    Array<{
      type: 'error_spike' | 'traffic_spike' | 'performance_degradation';
      timestamp: Date;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>
  > {
    const anomalies: any[] = [];

    // Detect error spikes (>3x average)
    const avgErrors =
      errorsPerHour.reduce((sum, e) => sum + e.count, 0) / errorsPerHour.length || 1;
    errorsPerHour.forEach((hour) => {
      if (hour.count > avgErrors * 3) {
        anomalies.push({
          type: 'error_spike',
          timestamp: new Date(hour.hour),
          severity: hour.count > avgErrors * 5 ? 'high' : 'medium',
          description: `Error spike detected: ${hour.count} errors (${Math.round((hour.count / avgErrors) * 100)}% above average)`,
        });
      }
    });

    // Detect traffic spikes (>3x average)
    const avgLogs = logsPerHour.reduce((sum, l) => sum + l.count, 0) / logsPerHour.length || 1;
    logsPerHour.forEach((hour) => {
      if (hour.count > avgLogs * 3) {
        anomalies.push({
          type: 'traffic_spike',
          timestamp: new Date(hour.hour),
          severity: hour.count > avgLogs * 5 ? 'high' : 'medium',
          description: `Traffic spike detected: ${hour.count} requests (${Math.round((hour.count / avgLogs) * 100)}% above average)`,
        });
      }
    });

    // Detect performance degradation
    if (performanceMetrics.p95ResponseTime > 2000) {
      anomalies.push({
        type: 'performance_degradation',
        timestamp: new Date(),
        severity: performanceMetrics.p95ResponseTime > 5000 ? 'high' : 'medium',
        description: `High P95 response time detected: ${performanceMetrics.p95ResponseTime}ms`,
      });
    }

    return anomalies;
  }

  /**
   * Search logs by correlation ID
   */
  async searchByCorrelationId(correlationId: string): Promise<any[]> {
    if (!this.elasticsearchClient) {
      throw new Error('Elasticsearch not configured');
    }

    const response = await this.elasticsearchClient.search({
      index: `${this.configService.get<string>('ELASTICSEARCH_LOG_INDEX', 'strellerminds-logs')}*`,
      body: {
        query: { term: { correlationId } },
        sort: [{ '@timestamp': 'asc' }],
        size: 1000,
      },
    });

    return response.body.hits.hits.map((hit: any) => hit._source);
  }

  /**
   * Generate daily report
   */
  async generateDailyReport(date: Date): Promise<any> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const analysis = await this.analyzeLogs({ start, end });

    return {
      date: date.toISOString().split('T')[0],
      ...analysis,
      generatedAt: new Date().toISOString(),
    };
  }
}
