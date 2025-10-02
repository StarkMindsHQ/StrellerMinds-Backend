import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { DataSource } from 'typeorm';
import type { QueryAnalyzerService } from './query-analyzer.service';
import type { DatabaseOptimizationConfig } from '../interfaces/optimization-config.interface';

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly queryAnalyzer: QueryAnalyzerService,
    private readonly config: DatabaseOptimizationConfig,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async performPerformanceAnalysis(): Promise<void> {
    if (!this.config.enableQueryLogging) {
      return;
    }

    try {
      this.logger.log('Starting performance analysis...');

      const slowQueries = this.queryAnalyzer.getSlowQueries();

      if (slowQueries.length > 0) {
        this.logger.warn(`Found ${slowQueries.length} slow queries`);

        for (const query of slowQueries.slice(0, 5)) {
          // Analyze top 5 slow queries
          const analysis = await this.queryAnalyzer.analyzeQuery(query.query);

          this.logger.warn(`Slow query analysis:`, {
            queryId: query.queryId,
            avgExecutionTime: query.avgExecutionTime,
            performanceScore: analysis.performanceScore,
            suggestionsCount: analysis.suggestions.length,
          });
        }
      }

      // Get database statistics
      const dbStats = await this.getDatabaseStatistics();
      this.logger.log('Database statistics:', dbStats);
    } catch (error) {
      this.logger.error('Performance analysis failed:', error);
    }
  }

  async getDatabaseStatistics(): Promise<any> {
    const queries = [
      // Connection statistics
      `SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active'`,

      // Cache hit ratio
      `SELECT 
        sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 as cache_hit_ratio
       FROM pg_statio_user_tables`,

      // Index usage
      `SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch
       FROM pg_stat_user_indexes 
       ORDER BY idx_tup_read DESC 
       LIMIT 10`,
    ];

    const results = {};

    try {
      results['active_connections'] = await this.dataSource.query(queries[0]);
      results['cache_hit_ratio'] = await this.dataSource.query(queries[1]);
      results['top_indexes'] = await this.dataSource.query(queries[2]);
    } catch (error) {
      this.logger.error('Failed to get database statistics:', error);
    }

    return results;
  }

  async getTableStatistics(tableName: string): Promise<any> {
    const query = `
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_tup_hot_upd as hot_updates,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables 
      WHERE tablename = $1
    `;

    return await this.dataSource.query(query, [tableName]);
  }
}
