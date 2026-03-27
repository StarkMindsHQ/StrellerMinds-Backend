import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { DataSource } from 'typeorm';
import { DatabaseOptimizationService } from '../services/database-optimization.service';

@Injectable()
export class QueryPerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(QueryPerformanceInterceptor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly optimizationService: DatabaseOptimizationService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(async () => {
        const duration = Date.now() - start;
        
        // Log slow requests
        if (duration > 1000) {
          this.logger.warn(
            `Slow request detected: ${request.method} ${request.url} took ${duration}ms`,
          );

          // Analyze database queries if available
          await this.analyzeDatabaseQueries();
        }
      }),
    );
  }

  private async analyzeDatabaseQueries(): Promise<void> {
    try {
      // Get recent slow queries from the database
      const slowQueries = await this.dataSource.query(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        WHERE mean_time > 1000 
        ORDER BY mean_time DESC 
        LIMIT 10
      `);

      for (const query of slowQueries) {
        await this.optimizationService.analyzeQuery(
          query.query,
          query.mean_time,
          query.rows,
        );
      }
    } catch (error) {
      this.logger.error('Failed to analyze database queries', error);
    }
  }
}
