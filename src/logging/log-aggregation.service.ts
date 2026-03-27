import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import { Client } from '@elastic/elasticsearch';
import { CorrelationLoggerService } from './correlation-logger.service';

/**
 * Log aggregation service for collecting and forwarding logs
 */
@Injectable()
export class LogAggregationService implements OnModuleDestroy {
  private readonly logger: winston.Logger;
  private elasticsearchClient?: Client;
  private logBuffer: any[] = [];
  private readonly bufferSize: number;
  private readonly flushIntervalMs: number;
  private flushTimer: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly correlationLogger: CorrelationLoggerService,
  ) {
    this.bufferSize = this.configService.get<number>('LOG_AGREGATION_BUFFER_SIZE', 100);
    this.flushIntervalMs = this.configService.get<number>('LOG_AGREGATION_FLUSH_INTERVAL', 5000);

    // Initialize Elasticsearch client if configured
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
      this.correlationLogger.log('Elasticsearch log aggregation enabled', {
        node: esNode,
      });
    }

    // Start periodic flush
    this.startFlushTimer();
  }

  /**
   * Add log entry to aggregation buffer
   */
  addLog(logEntry: any): void {
    this.logBuffer.push({
      timestamp: new Date().toISOString(),
      ...logEntry,
    });

    // Flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      this.flushLogs();
    }
  }

  /**
   * Flush logs to Elasticsearch
   */
  async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0 || !this.elasticsearchClient) {
      return;
    }

    try {
      const indexName = this.getIndexName();
      
      // Bulk index documents
      const operations = this.logBuffer.flatMap((doc) => [
        { index: { _index: indexName } },
        doc,
      ]);

      await this.elasticsearchClient.bulk({
        body: operations,
      });

      this.correlationLogger.debug('Flushed logs to Elasticsearch', {
        count: this.logBuffer.length,
        index: indexName,
      });

      this.logBuffer = [];
    } catch (error) {
      this.correlationLogger.error('Failed to flush logs to Elasticsearch', error.stack, {
        error: error.message,
      });
    }
  }

  /**
   * Get index name with date suffix
   */
  private getIndexName(): string {
    const indexPrefix = this.configService.get<string>(
      'ELASTICSEARCH_LOG_INDEX',
      'strellerminds-logs',
    );
    const dateSuffix = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `${indexPrefix}-${dateSuffix}`;
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushLogs();
    }, this.flushIntervalMs);
  }

  /**
   * Stop flush timer on module destroy
   */
  onModuleDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      // Final flush
      this.flushLogs();
    }
  }

  /**
   * Query logs from Elasticsearch
   */
  async queryLogs(query: {
    correlationId?: string;
    level?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<any[]> {
    if (!this.elasticsearchClient) {
      throw new Error('Elasticsearch not configured');
    }

    const must: any[] = [];
    
    if (query.correlationId) {
      must.push({ term: { correlationId: query.correlationId } });
    }
    
    if (query.level) {
      must.push({ term: { severity: query.level } });
    }
    
    if (query.startTime || query.endTime) {
      must.push({
        range: {
          '@timestamp': {
            ...(query.startTime && { gte: query.startTime.toISOString() }),
            ...(query.endTime && { lte: query.endTime.toISOString() }),
          },
        },
      });
    }

    const response = await this.elasticsearchClient.search({
      index: `${this.configService.get<string>('ELASTICSEARCH_LOG_INDEX', 'strellerminds-logs')}*`,
      body: {
        query: {
          bool: {
            must,
          },
        },
        sort: [{ '@timestamp': 'desc' }],
        size: query.limit || 100,
      },
    });

    return response.hits.hits.map((hit: any) => hit._source);
  }

  /**
   * Get log statistics
   */
  async getLogStats(timeRange: { start: Date; end: Date }): Promise<{
    totalLogs: number;
    byLevel: Record<string, number>;
    byCorrelationId: Record<string, number>;
    errorsByType: Record<string, number>;
  }> {
    if (!this.elasticsearchClient) {
      throw new Error('Elasticsearch not configured');
    }

    const response = await this.elasticsearchClient.search({
      index: `${this.configService.get<string>('ELASTICSEARCH_LOG_INDEX', 'strellerminds-logs')}*`,
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
          by_level: {
            terms: { field: 'severity' },
          },
          by_correlation: {
            terms: { field: 'correlationId', size: 20 },
          },
          errors_by_type: {
            filter: { term: { severity: 'error' } },
            aggs: {
              by_type: {
                terms: { field: 'type' },
              },
            },
          },
        },
      },
    });

    const byLevel: Record<string, number> = {};
    response.body.aggregations.by_level.buckets.forEach((bucket: any) => {
      byLevel[bucket.key] = bucket.doc_count;
    });

    const byCorrelationId: Record<string, number> = {};
    response.body.aggregations.by_correlation.buckets.forEach((bucket: any) => {
      byCorrelationId[bucket.key] = bucket.doc_count;
    });

    const errorsByType: Record<string, number> = {};
    response.body.aggregations.errors_by_type.by_type.buckets.forEach((bucket: any) => {
      errorsByType[bucket.key] = bucket.doc_count;
    });

    return {
      totalLogs: response.body.hits.total.value,
      byLevel,
      byCorrelationId,
      errorsByType,
    };
  }
}
