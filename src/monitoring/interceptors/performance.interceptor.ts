import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApmService } from '../services/apm.service';
import { DatabaseOptimizationService } from '../services/database-optimization.service';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  constructor(
    private apmService: ApmService,
    private databaseOptimization: DatabaseOptimizationService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const endpoint = url.split('?')[0]; // Remove query params

    // Start transaction
    const transactionId = this.apmService.startTransaction(
      `${method} ${endpoint}`,
      'http',
      {
        endpoint,
        method,
        userId: request.user?.id,
        ip: request.ip,
      },
    );

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = context.switchToHttp().getResponse().statusCode;

          // End transaction
          this.apmService.endTransaction(transactionId, 'success', {
            statusCode,
            responseSize: JSON.stringify(data).length,
          });

          // Log slow requests
          if (duration > 1000) {
            this.logger.warn(`Slow request: ${method} ${endpoint} took ${duration}ms`);
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          // End transaction with error
          this.apmService.endTransaction(transactionId, 'error', {
            statusCode,
            error: error.message,
          });

          this.logger.error(
            `Request failed: ${method} ${endpoint} - ${error.message} (${duration}ms)`,
          );
        },
      }),
    );
  }
}
