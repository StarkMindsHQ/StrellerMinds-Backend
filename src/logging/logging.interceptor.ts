import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppLogger } from './logger.service';

/**
 * Logging Interceptor for HTTP requests
 * Logs request/response information with timing
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Optional()
    @Inject(AppLogger)
    private readonly logger?: AppLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.logger) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { method, url, headers, query, body } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const duration = Date.now() - start;

          // Log API request
          this.logger.logApi(method, url, statusCode, duration, {
            userAgent: headers['user-agent'],
            ip: headers['x-forwarded-for'] || request.ip,
            query: Object.keys(query).length ? query : undefined,
            // Don't log body for security reasons
          });
        },
        error: (error: Error) => {
          const duration = Date.now() - start;

          // Log error
          this.logger.error(
            `${method} ${url} - Error after ${duration}ms: ${error.message}`,
            error.stack,
            { method, url, statusCode: 500 },
          );
        },
      }),
    );
  }
}