import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { PerformanceMonitoringService } from './performance-monitoring.service';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  constructor(private readonly performanceMonitoringService: PerformanceMonitoringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const startTime = process.hrtime.bigint();
    const method = request.method;
    const url = request.url;
    const endpoint = this.extractEndpoint(url);

    // Add request start time to request object for other middleware
    request.performanceStartTime = startTime;

    return next.handle().pipe(
      tap(() => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        const statusCode = response.statusCode;

        // Record performance metrics
        this.performanceMonitoringService.recordEndpointPerformance(
          endpoint,
          method,
          duration,
          statusCode,
        );

        // Add performance headers
        response.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
        response.setHeader('X-Performance-Grade', this.getPerformanceGrade(duration));

        // Log slow requests
        if (duration > 1000) {
          this.logger.warn(
            `Slow request detected: ${method} ${endpoint} - ${duration.toFixed(2)}ms`,
            {
              method,
              endpoint,
              duration,
              statusCode,
              userAgent: request.get('User-Agent'),
              ip: request.ip,
            },
          );
        }

        // Log performance metrics in debug mode
        this.logger.debug(
          `Performance: ${method} ${endpoint} - ${duration.toFixed(2)}ms - ${statusCode}`,
        );
      }),
      catchError((error) => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        const statusCode = error.status || 500;

        // Record error performance metrics
        this.performanceMonitoringService.recordEndpointPerformance(
          endpoint,
          method,
          duration,
          statusCode,
        );

        // Log error with performance context
        this.logger.error(
          `Error in ${method} ${endpoint} - ${duration.toFixed(2)}ms - ${statusCode}`,
          {
            error: error.message,
            stack: error.stack,
            method,
            endpoint,
            duration,
            statusCode,
            userAgent: request.get('User-Agent'),
            ip: request.ip,
          },
        );

        return throwError(() => error);
      }),
    );
  }

  private extractEndpoint(url: string): string {
    // Remove query parameters and normalize the endpoint
    const baseUrl = url.split('?')[0];

    // Replace dynamic segments with placeholders for better grouping
    return baseUrl
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id') // UUIDs
      .replace(/\/\d+/g, '/:id') // Numeric IDs
      .replace(/\/[a-zA-Z0-9]{24}/g, '/:id'); // MongoDB ObjectIds
  }

  private getPerformanceGrade(duration: number): string {
    if (duration < 100) return 'A+';
    if (duration < 300) return 'A';
    if (duration < 500) return 'B';
    if (duration < 1000) return 'C';
    if (duration < 2000) return 'D';
    return 'F';
  }
}

/**
 * Decorator to exclude specific endpoints from performance monitoring
 */
export const ExcludeFromPerformanceMonitoring = () => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('excludeFromPerformanceMonitoring', true, descriptor.value);
  };
};

/**
 * Decorator to set custom performance thresholds for specific endpoints
 */
export const PerformanceThreshold = (thresholds: { warning?: number; critical?: number }) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('performanceThresholds', thresholds, descriptor.value);
  };
};
