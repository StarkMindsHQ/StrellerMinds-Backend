import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiAnalyticsService } from '../services/api-analytics.service';

@Injectable()
export class ApiUsageInterceptor implements NestInterceptor {
  constructor(private analyticsService: ApiAnalyticsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    // Only track if API key is present
    if (!request.apiKey) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = context.switchToHttp().getResponse().statusCode;

          // Track usage asynchronously
          setImmediate(() => {
            this.analyticsService.trackUsage(
              request.apiKey.id,
              request.path,
              request.method,
              statusCode,
              duration,
              {
                ipAddress: request.ip,
                userAgent: request.headers['user-agent'],
                queryParams: request.query,
                requestHeaders: request.headers,
                responseSize: JSON.stringify(data).length,
              },
            ).catch(() => {
              // Ignore tracking errors
            });
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          setImmediate(() => {
            this.analyticsService.trackUsage(
              request.apiKey.id,
              request.path,
              request.method,
              statusCode,
              duration,
              {
                ipAddress: request.ip,
                userAgent: request.headers['user-agent'],
                errorDetails: {
                  message: error.message,
                  code: error.code,
                },
              },
            ).catch(() => {
              // Ignore tracking errors
            });
          });
        },
      }),
    );
  }
}
