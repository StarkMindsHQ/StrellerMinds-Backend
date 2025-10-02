import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';

export interface SlowQueryLog {
  query: string;
  parameters: any[];
  executionTime: number;
  timestamp: Date;
  context?: string;
}

export interface ConnectionPoolMetrics {
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
  waitingRequests: number;
}

@Injectable()
export class DatabaseMonitoringService {
  private readonly logger = new Logger(DatabaseMonitoringService.name);
  private readonly slowQueryThreshold = 100; // 100ms threshold
  private slowQueries: SlowQueryLog[] = [];
  private connectionPoolMetrics: ConnectionPoolMetrics = {
    totalConnections: 0,
    idleConnections: 0,
    activeConnections: 0,
    waitingRequests: 0,
  };

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    // Subscribe to TypeORM query events
    this.setupQueryMonitoring();
  }

  private setupQueryMonitoring() {
    // Override the query method to add monitoring
    const originalQuery = this.dataSource.query;

    this.dataSource.query = async (
      query: string,
      parameters?: any[],
      usedQueryRunner?: QueryRunner,
    ) => {
      const startTime = Date.now();

      try {
        const result = await originalQuery.call(
          this.dataSource,
          query,
          parameters,
          usedQueryRunner,
        );
        const executionTime = Date.now() - startTime;

        // Log slow queries
        if (executionTime > this.slowQueryThreshold) {
          this.logSlowQuery(query, parameters, executionTime);
        }

        // Log all queries in development
        // Skip environment check for now to avoid TypeScript errors
        this.logger.debug(
          `Query executed (${executionTime}ms):\nQuery: ${query}\nParameters: ${JSON.stringify(parameters)}`,
        );

        return result;
      } catch (error: any) {
        const executionTime = Date.now() - startTime;
        this.logger.error(
          `Failed query (${executionTime}ms):\nQuery: ${query}\nParameters: ${JSON.stringify(parameters)}\nError: ${error.message}`,
        );
        throw error;
      }
    };
  }

  private logSlowQuery(query: string, parameters: any[] | undefined, executionTime: number) {
    const slowQuery: SlowQueryLog = {
      query,
      parameters: parameters || [],
      executionTime,
      timestamp: new Date(),
    };

    this.slowQueries.push(slowQuery);

    // Keep only recent slow queries (last 1000)
    if (this.slowQueries.length > 1000) {
      this.slowQueries = this.slowQueries.slice(-1000);
    }

    this.logger.warn(
      `Slow query detected (${executionTime}ms):\nQuery: ${query}\nParameters: ${JSON.stringify(parameters)}`,
    );
  }

  public async getSlowQueries(limit: number = 50, hours: number = 24): Promise<SlowQueryLog[]> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.slowQueries
      .filter((query) => query.timestamp >= cutoffTime)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  public async getConnectionPoolMetrics(): Promise<ConnectionPoolMetrics> {
    try {
      // For PostgreSQL, we can query the connection statistics
      const result = await this.dataSource.query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections
        FROM pg_stat_activity
      `);

      if (result && result[0]) {
        this.connectionPoolMetrics = {
          totalConnections: parseInt(result[0].total_connections) || 0,
          idleConnections: parseInt(result[0].idle_connections) || 0,
          activeConnections: parseInt(result[0].active_connections) || 0,
          waitingRequests: 0, // This would require additional queries to get accurate data
        };
      }
    } catch (error) {
      this.logger.error('Failed to get connection pool metrics:', error);
    }

    return this.connectionPoolMetrics;
  }

  public getQueryMetrics() {
    // Calculate query metrics
    const totalQueries = this.slowQueries.length;
    const slowQueries = this.slowQueries.filter((q) => q.executionTime > this.slowQueryThreshold);
    const averageExecutionTime =
      totalQueries > 0
        ? this.slowQueries.reduce((sum, q) => sum + q.executionTime, 0) / totalQueries
        : 0;

    return {
      timestamp: new Date(),
      metrics: {
        totalQueries,
        slowQueries: slowQueries.length,
        averageExecutionTime: Math.round(averageExecutionTime * 100) / 100,
        slowQueryThreshold: this.slowQueryThreshold,
      },
    };
  }

  public clearSlowQueryLogs() {
    this.slowQueries = [];
  }
}
