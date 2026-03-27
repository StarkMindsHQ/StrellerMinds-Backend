import { Injectable, Logger, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseConfig } from '../config/database.config';
import { performance } from 'perf_hooks';

export interface DatabaseMetrics {
  connectionPool: {
    active: number;
    idle: number;
    waiting: number;
    total: number;
    maxConnections: number;
    minConnections: number;
    utilization: number;
    averageWaitTime: number;
    connectionErrors: number;
    totalAcquires: number;
    totalReleases: number;
  };
  database: {
    size: string;
    connections: number;
    transactions: number;
    lockWaits: number;
    deadlocks: number;
  };
  performance: {
    slowQueries: SlowQuery[];
    averageQueryTime: number;
    queriesPerSecond: number;
    cacheHitRatio: number;
  };
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: Date;
    latency: number;
    uptime: number;
    recommendations: string[];
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
export class DatabaseMonitorService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseMonitorService.name);
  private slowQueries: SlowQuery[] = [];
  private readonly slowQueryThreshold = 1000; // 1 second
  private poolMetrics = {
    totalAcquires: 0,
    totalReleases: 0,
    connectionErrors: 0,
    lastMetricsReset: new Date(),
  };
  private healthCheckHistory: Array<{ timestamp: Date; healthy: boolean; latency: number }> = [];
  private readonly healthCheckHistoryLimit = 100;
  private moduleStartTime: number = Date.now();

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private databaseConfig: DatabaseConfig,
  ) {}

  async onModuleInit() {
    this.logger.log('Database Monitor Service initialized');
    await this.performInitialHealthCheck();
  }

  async onApplicationShutdown() {
    this.logger.log('Database Monitor Service shutting down');
  }

  /**
   * Perform initial health check on startup
   */
  private async performInitialHealthCheck(): Promise<void> {
    try {
      const healthResult = await this.databaseConfig.performHealthCheck(this.dataSource);
      if (healthResult.healthy) {
        this.logger.log(`Database connection healthy (${healthResult.latency}ms latency)`);
      } else {
        this.logger.error(`Database connection failed: ${healthResult.error}`);
      }
    } catch (error) {
      this.logger.error(`Initial health check failed: ${error.message}`);
    }
  }

  /**
   * Get comprehensive database metrics
   */
  async getMetrics(): Promise<DatabaseMetrics> {
    try {
      const [connectionPool, database, tables, health] = await Promise.all([
        this.getEnhancedConnectionPoolMetrics(),
        this.getEnhancedDatabaseMetrics(),
        this.getTableStats(),
        this.getHealthMetrics(),
      ]);

      return {
        connectionPool,
        database,
        performance: {
          slowQueries: this.getSlowQueries(),
          averageQueryTime: this.calculateAverageQueryTime(),
          queriesPerSecond: this.calculateQueriesPerSecond(),
          cacheHitRatio: await this.getCacheHitRatio(),
        },
        health,
        tables,
      };
    } catch (error) {
      this.logger.error(`Failed to get database metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get enhanced connection pool metrics
   */
  private async getEnhancedConnectionPoolMetrics(): Promise<DatabaseMetrics['connectionPool']> {
    const driver = this.dataSource.driver as any;
    const pool = driver.master;
    const config = this.dataSource.options.extra as any;

    const totalConnections = pool.totalCount || 0;
    const idleConnections = pool.idleCount || 0;
    const activeConnections = totalConnections - idleConnections;
    const waitingClients = pool.waitingCount || 0;

    // Calculate utilization
    const utilization = totalConnections > 0 ? (activeConnections / totalConnections) * 100 : 0;

    // Calculate average wait time (simplified)
    const averageWaitTime = waitingClients > 0 ? 100 : 0; // Placeholder - would need actual timing

    // Update database config metrics
    this.databaseConfig.updatePoolMetrics({
      totalConnections,
      activeConnections,
      idleConnections,
      waitingClients,
    });

    return {
      active: activeConnections,
      idle: idleConnections,
      waiting: waitingClients,
      total: totalConnections,
      maxConnections: config?.max || 10,
      minConnections: config?.min || 1,
      utilization: Math.round(utilization),
      averageWaitTime,
      connectionErrors: this.poolMetrics.connectionErrors,
      totalAcquires: this.poolMetrics.totalAcquires,
      totalReleases: this.poolMetrics.totalReleases,
    };
  }

  /**
   * Get enhanced database-level metrics
   */
  private async getEnhancedDatabaseMetrics(): Promise<DatabaseMetrics['database']> {
    const dbName = this.dataSource.options.database as string;

    // Get comprehensive database metrics
    const [sizeResult, connectionsResult, transactionsResult, lockResult] = await Promise.all([
      this.dataSource.query(
        `SELECT pg_size_pretty(pg_database_size($1)) as size`,
        [dbName],
      ),
      this.dataSource.query(
        `SELECT count(*) as count FROM pg_stat_activity WHERE datname = $1`,
        [dbName],
      ),
      this.dataSource.query(
        `SELECT xact_commit + xact_rollback as transactions FROM pg_stat_database WHERE datname = $1`,
        [dbName],
      ),
      this.dataSource.query(
        `SELECT 
         (SELECT count(*) FROM pg_stat_activity WHERE wait_event = 'Lock' AND datname = $1) as lock_waits,
         (SELECT count(*) FROM pg_stat_database WHERE deadlocks > 0 AND datname = $1) as deadlocks`,
        [dbName],
      ),
    ]);

    return {
      size: sizeResult[0]?.size || '0 bytes',
      connections: parseInt(connectionsResult[0]?.count || '0'),
      transactions: parseInt(transactionsResult[0]?.transactions || '0'),
      lockWaits: parseInt(lockResult[0]?.lock_waits || '0'),
      deadlocks: parseInt(lockResult[0]?.deadlocks || '0'),
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
   * Get health metrics
   */
  private async getHealthMetrics(): Promise<DatabaseMetrics['health']> {
    const healthResult = await this.databaseConfig.performHealthCheck(this.dataSource);
    const uptime = Date.now() - this.moduleStartTime;
    const recommendations = this.databaseConfig.getPoolRecommendations();

    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (!healthResult.healthy) {
      status = 'unhealthy';
    } else if (healthResult.latency > 1000 || recommendations.length > 0) {
      status = 'degraded';
    }

    return {
      status,
      lastCheck: new Date(),
      latency: healthResult.latency,
      uptime,
      recommendations,
    };
  }

  /**
   * Calculate queries per second
   */
  private calculateQueriesPerSecond(): number {
    const timeSinceReset = (Date.now() - this.poolMetrics.lastMetricsReset.getTime()) / 1000;
    const totalQueries = this.poolMetrics.totalAcquires;
    return timeSinceReset > 0 ? Math.round(totalQueries / timeSinceReset) : 0;
  }

  /**
   * Get cache hit ratio
   */
  private async getCacheHitRatio(): Promise<number> {
    try {
      const result = await this.dataSource.query(`
        SELECT 
          CASE 
            WHEN (blks_hit + blks_read) = 0 THEN 0
            ELSE ROUND((blks_hit::float / (blks_hit + blks_read)) * 100, 2)
          END as cache_hit_ratio
        FROM pg_stat_database 
        WHERE datname = current_database()
      `);
      
      return parseFloat(result[0]?.cache_hit_ratio || '0');
    } catch (error) {
      this.logger.warn(`Failed to get cache hit ratio: ${error.message}`);
      return 0;
    }
  }

  /**
   * Log connection pool events
   */
  logConnectionEvent(event: 'acquire' | 'release' | 'error', metadata?: any): void {
    switch (event) {
      case 'acquire':
        this.poolMetrics.totalAcquires++;
        break;
      case 'release':
        this.poolMetrics.totalReleases++;
        break;
      case 'error':
        this.poolMetrics.connectionErrors++;
        this.logger.error(`Connection pool error: ${JSON.stringify(metadata)}`);
        break;
    }
  }

  /**
   * Reset pool metrics (useful for testing or periodic reset)
   */
  resetMetrics(): void {
    this.poolMetrics = {
      totalAcquires: 0,
      totalReleases: 0,
      connectionErrors: 0,
      lastMetricsReset: new Date(),
    };
    this.slowQueries = [];
    this.healthCheckHistory = [];
    this.logger.log('Database metrics reset');
  }

  /**
   * Get connection pool recommendations
   */
  getPoolRecommendations(): string[] {
    return this.databaseConfig.getPoolRecommendations();
  }

  /**
   * Scheduled health check
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async scheduledHealthCheck(): Promise<void> {
    try {
      const healthResult = await this.databaseConfig.performHealthCheck(this.dataSource);
      
      this.healthCheckHistory.push({
        timestamp: new Date(),
        healthy: healthResult.healthy,
        latency: healthResult.latency,
      });

      // Keep history size limited
      if (this.healthCheckHistory.length > this.healthCheckHistoryLimit) {
        this.healthCheckHistory.shift();
      }

      // Log if unhealthy
      if (!healthResult.healthy) {
        this.logger.warn(`Scheduled health check failed: ${healthResult.error}`);
      }
    } catch (error) {
      this.logger.error(`Scheduled health check error: ${error.message}`);
    }
  }

  /**
   * Get health check history
   */
  getHealthCheckHistory(limit: number = 50): typeof this.healthCheckHistory {
    return this.healthCheckHistory.slice(-limit).reverse();
  }

  /**
   * Enhanced health check with detailed analysis
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    metrics: Partial<DatabaseMetrics>;
    recommendations: string[];
    status: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Test database connection
      const healthResult = await this.databaseConfig.performHealthCheck(this.dataSource);
      
      // Get metrics
      const metrics = await this.getMetrics();

      // Check for issues
      if (metrics.connectionPool.waiting > 5) {
        issues.push(`High connection pool wait count: ${metrics.connectionPool.waiting}`);
        recommendations.push('Consider increasing DATABASE_POOL_MAX');
      }

      if (metrics.connectionPool.utilization > 80) {
        issues.push(`High connection pool utilization: ${metrics.connectionPool.utilization}%`);
        recommendations.push('Consider scaling up database or optimizing queries');
      }

      if (metrics.performance.slowQueries.length > 10) {
        issues.push(`High number of slow queries: ${metrics.performance.slowQueries.length}`);
        recommendations.push('Review and optimize slow queries');
      }

      if (metrics.performance.averageQueryTime > 500) {
        issues.push(`High average query time: ${metrics.performance.averageQueryTime}ms`);
        recommendations.push('Consider adding database indexes or optimizing queries');
      }

      if (metrics.database.lockWaits > 5) {
        issues.push(`High number of lock waits: ${metrics.database.lockWaits}`);
        recommendations.push('Review transaction isolation levels and query patterns');
      }

      if (metrics.database.deadlocks > 0) {
        issues.push(`Database deadlocks detected: ${metrics.database.deadlocks}`);
        recommendations.push('Review transaction order and implement retry logic');
      }

      if (healthResult.latency > 1000) {
        issues.push(`High database latency: ${healthResult.latency}ms`);
        recommendations.push('Check database performance and network connectivity');
      }

      // Determine overall status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (!healthResult.healthy || issues.length > 3) {
        status = 'unhealthy';
      } else if (issues.length > 0 || healthResult.latency > 500) {
        status = 'degraded';
      }

      return {
        healthy: healthResult.healthy && issues.length === 0,
        issues,
        metrics,
        recommendations,
        status,
      };
    } catch (error) {
      return {
        healthy: false,
        issues: [`Database connection failed: ${error.message}`],
        metrics: {},
        recommendations: ['Check database connection and configuration'],
        status: 'unhealthy',
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
