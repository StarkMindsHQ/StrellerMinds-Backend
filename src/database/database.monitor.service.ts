import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface DatabaseMetrics {
  connectionPool: {
    active: number;
    idle: number;
    waiting: number;
    total: number;
  };
  database: {
    size: string;
    connections: number;
    transactions: number;
  };
  performance: {
    slowQueries: SlowQuery[];
    averageQueryTime: number;
  };
  tables: TableStats[];
}

export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
}

export interface TableStats {
  tableName: string;
  rowCount: number;
  size: string;
  indexSize: string;
}

/**
 * Service for monitoring database health and performance
 */
@Injectable()
export class DatabaseMonitorService {
  private readonly logger = new Logger(DatabaseMonitorService.name);
  private slowQueries: SlowQuery[] = [];
  private readonly slowQueryThreshold = 1000; // 1 second

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  /**
   * Get comprehensive database metrics
   */
  async getMetrics(): Promise<DatabaseMetrics> {
    try {
      const [connectionPool, database, tables] = await Promise.all([
        this.getConnectionPoolMetrics(),
        this.getDatabaseMetrics(),
        this.getTableStats(),
      ]);

      return {
        connectionPool,
        database,
        performance: {
          slowQueries: this.getSlowQueries(),
          averageQueryTime: this.calculateAverageQueryTime(),
        },
        tables,
      };
    } catch (error) {
      this.logger.error(`Failed to get database metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get connection pool metrics
   */
  private async getConnectionPoolMetrics(): Promise<DatabaseMetrics['connectionPool']> {
    // Note: TypeORM doesn't expose pool stats directly
    // This is a simplified version - in production, you'd use pg-pool directly
    const driver = this.dataSource.driver as any;
    const pool = driver.master;

    return {
      active: pool.totalCount || 0,
      idle: pool.idleCount || 0,
      waiting: pool.waitingCount || 0,
      total: pool.totalCount || 0,
    };
  }

  /**
   * Get database-level metrics
   */
  private async getDatabaseMetrics(): Promise<DatabaseMetrics['database']> {
    const dbName = this.dataSource.options.database as string;

    // Get database size
    const sizeResult = await this.dataSource.query(
      `
      SELECT pg_size_pretty(pg_database_size($1)) as size
    `,
      [dbName],
    );

    // Get active connections
    const connectionsResult = await this.dataSource.query(
      `
      SELECT count(*) as count
      FROM pg_stat_activity
      WHERE datname = $1
    `,
      [dbName],
    );

    // Get transaction count
    const transactionsResult = await this.dataSource.query(
      `
      SELECT xact_commit + xact_rollback as transactions
      FROM pg_stat_database
      WHERE datname = $1
    `,
      [dbName],
    );

    return {
      size: sizeResult[0]?.size || '0 bytes',
      connections: parseInt(connectionsResult[0]?.count || '0'),
      transactions: parseInt(transactionsResult[0]?.transactions || '0'),
    };
  }

  /**
   * Get table statistics
   */
  private async getTableStats(): Promise<TableStats[]> {
    const result = await this.dataSource.query(`
      SELECT
        schemaname || '.' || tablename as table_name,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size,
        pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename)) as index_size,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
      LIMIT 20
    `);

    return result.map((row: any) => ({
      tableName: row.table_name,
      rowCount: parseInt(row.row_count || '0'),
      size: row.size,
      indexSize: row.index_size,
    }));
  }

  /**
   * Log slow query
   */
  logSlowQuery(query: string, duration: number): void {
    if (duration > this.slowQueryThreshold) {
      this.slowQueries.push({
        query: query.substring(0, 200), // Truncate long queries
        duration,
        timestamp: new Date(),
      });

      // Keep only last 100 slow queries
      if (this.slowQueries.length > 100) {
        this.slowQueries.shift();
      }

      this.logger.warn(`Slow query detected (${duration}ms): ${query.substring(0, 100)}...`);
    }
  }

  /**
   * Get recent slow queries
   */
  getSlowQueries(limit: number = 20): SlowQuery[] {
    return this.slowQueries.slice(-limit).reverse();
  }

  /**
   * Calculate average query time
   */
  private calculateAverageQueryTime(): number {
    if (this.slowQueries.length === 0) return 0;
    const total = this.slowQueries.reduce((sum, q) => sum + q.duration, 0);
    return Math.round(total / this.slowQueries.length);
  }

  /**
   * Check database health
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    metrics: Partial<DatabaseMetrics>;
  }> {
    const issues: string[] = [];

    try {
      // Test database connection
      await this.dataSource.query('SELECT 1');

      // Get metrics
      const metrics = await this.getMetrics();

      // Check for issues
      if (metrics.connectionPool.waiting > 5) {
        issues.push(`High connection pool wait count: ${metrics.connectionPool.waiting}`);
      }

      if (metrics.performance.slowQueries.length > 10) {
        issues.push(`High number of slow queries: ${metrics.performance.slowQueries.length}`);
      }

      if (metrics.performance.averageQueryTime > 500) {
        issues.push(`High average query time: ${metrics.performance.averageQueryTime}ms`);
      }

      return {
        healthy: issues.length === 0,
        issues,
        metrics,
      };
    } catch (error) {
      return {
        healthy: false,
        issues: [`Database connection failed: ${error.message}`],
        metrics: {},
      };
    }
  }

  /**
   * Get index usage statistics
   */
  async getIndexUsage(): Promise<
    Array<{
      tableName: string;
      indexName: string;
      scans: number;
      tuples: number;
    }>
  > {
    const result = await this.dataSource.query(`
      SELECT
        schemaname || '.' || tablename as table_name,
        indexname as index_name,
        idx_scan as scans,
        idx_tup_read as tuples
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC
      LIMIT 50
    `);

    return result.map((row: any) => ({
      tableName: row.table_name,
      indexName: row.index_name,
      scans: parseInt(row.scans || '0'),
      tuples: parseInt(row.tuples || '0'),
    }));
  }

  /**
   * Get unused indexes (potential candidates for removal)
   */
  async getUnusedIndexes(): Promise<
    Array<{
      tableName: string;
      indexName: string;
      size: string;
    }>
  > {
    const result = await this.dataSource.query(`
      SELECT
        schemaname || '.' || tablename as table_name,
        indexname as index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
        AND indexrelname NOT LIKE '%_pkey'
      ORDER BY pg_relation_size(indexrelid) DESC
    `);

    return result.map((row: any) => ({
      tableName: row.table_name,
      indexName: row.index_name,
      size: row.size,
    }));
  }
}
