import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryRunner } from 'typeorm';

@Injectable()
export class DatabaseMonitoringService {
  private readonly logger = new Logger(DatabaseMonitoringService.name);
  private readonly slowQueryThreshold = 1000; 

  constructor() {
    // Subscribe to TypeORM query events
    this.setupQueryMonitoring();
  }

  private setupQueryMonitoring() {
    // This will be called when TypeORM emits query events
    const queryListener = (query: string, parameters?: any[], duration?: number) => {
      // Log slow queries
      if (duration && duration > this.slowQueryThreshold) {
        this.logger.warn(
          `Slow query detected (${duration}ms):\nQuery: ${query}\nParameters: ${JSON.stringify(parameters)}`,
        );
      }

      // Log all queries in development
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(
          `Query executed (${duration}ms):\nQuery: ${query}\nParameters: ${JSON.stringify(parameters)}`,
        );
      }
    };

    // Subscribe to TypeORM events
    // Note: This requires TypeORM configuration to enable query logging
    // Add this to your TypeORM config:
    // logging: true,
    // logger: 'advanced-console',
  }

  public getQueryMetrics() {
    // Implement query metrics collection
    // This could include:
    // - Average query execution time
    // - Most frequent queries
    // - Slowest queries
    // - Query error rates
    return {
      timestamp: new Date(),
      metrics: {
        // Add your metrics here
      },
    };
  }
} 