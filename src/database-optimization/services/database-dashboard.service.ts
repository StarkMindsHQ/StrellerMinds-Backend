import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DatabaseMonitoringService } from '../../monitoring/database-monitoring.service';
import { QueryCacheService } from './query-cache.service';
import { QueryAnalyzerService } from './query-analyzer.service';

export interface PerformanceSummary {
  totalQueries: number;
  slowQueries: number;
  averageExecutionTime: number;
  cacheHitRate: number;
  connectionPool: {
    total: number;
    active: number;
    idle: number;
  };
  topSlowQueries: Array<{
    query: string;
    executionTime: number;
    timestamp: Date;
  }>;
}

export interface TableUsage {
  tableName: string;
  readCount: number;
  writeCount: number;
  totalSize: string;
  indexSize: string;
}

@Injectable()
export class DatabaseDashboardService {
  private readonly logger = new Logger(DatabaseDashboardService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly databaseMonitoringService: DatabaseMonitoringService,
    private readonly queryCacheService: QueryCacheService,
    private readonly queryAnalyzerService: QueryAnalyzerService,
  ) {}

  async getPerformanceSummary(hours: number = 24): Promise<PerformanceSummary> {
    try {
      // Get query metrics from monitoring service
      const queryMetrics = this.databaseMonitoringService.getQueryMetrics();

      // Get connection pool metrics
      const connectionPoolMetrics = await this.databaseMonitoringService.getConnectionPoolMetrics();

      // Get cache stats
      const cacheStats = this.queryCacheService.getStats();

      // Calculate cache hit rate
      const cacheHitRate =
        cacheStats.hits + cacheStats.misses > 0
          ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100
          : 0;

      // Get top slow queries
      const slowQueries = await this.databaseMonitoringService.getSlowQueries(5, hours);
      const topSlowQueries = slowQueries.map((q) => ({
        query: q.query.substring(0, 100) + (q.query.length > 100 ? '...' : ''),
        executionTime: q.executionTime,
        timestamp: q.timestamp,
      }));

      return {
        totalQueries: queryMetrics.metrics.totalQueries,
        slowQueries: queryMetrics.metrics.slowQueries,
        averageExecutionTime: queryMetrics.metrics.averageExecutionTime,
        cacheHitRate: parseFloat(cacheHitRate.toFixed(2)),
        connectionPool: {
          total: connectionPoolMetrics.totalConnections,
          active: connectionPoolMetrics.activeConnections,
          idle: connectionPoolMetrics.idleConnections,
        },
        topSlowQueries,
      };
    } catch (error) {
      this.logger.error('Failed to get performance summary:', error);
      throw error;
    }
  }

  async getSlowQueries(limit: number = 50, hours: number = 24) {
    return this.databaseMonitoringService.getSlowQueries(limit, hours);
  }

  async getConnectionPoolMetrics() {
    return this.databaseMonitoringService.getConnectionPoolMetrics();
  }

  async getCacheStats() {
    return this.queryCacheService.getStats();
  }

  async getTopTables(limit: number = 10): Promise<TableUsage[]> {
    try {
      const query = `
        SELECT 
          schemaname,
          tablename,
          seq_scan as read_count,
          seq_tup_read as read_tuples,
          idx_scan as index_scan_count,
          idx_tup_fetch as index_tuples_fetched,
          n_tup_ins + n_tup_upd + n_tup_del as write_count,
          pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as total_size,
          pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename)) as index_size
        FROM pg_stat_user_tables
        ORDER BY (seq_scan + idx_scan) DESC
        LIMIT $1
      `;

      const result = await this.dataSource.query(query, [limit]);

      return result.map((row: any) => ({
        tableName: `${row.schemaname}.${row.tablename}`,
        readCount: parseInt(row.read_count) || 0,
        writeCount: parseInt(row.write_count) || 0,
        totalSize: row.total_size,
        indexSize: row.index_size,
      }));
    } catch (error) {
      this.logger.error('Failed to get top tables:', error);
      return [];
    }
  }

  async getQueryAnalysis(queryId: string) {
    // This would typically retrieve a stored query analysis
    // For now, we'll return a placeholder
    return {
      queryId,
      analysis: 'Query analysis would be available here',
      suggestions: [],
      performanceScore: 0,
    };
  }
}
