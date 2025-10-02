import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { TracingService } from './tracing.service';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TracingInterceptor.name);

  constructor(private readonly tracingService: TracingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const handler = context.getHandler();
    const controller = context.getClass();

    const spanName = `${controller.name}.${handler.name}`;
    const method = request.method;
    const url = request.url;
    const userAgent = request.headers['user-agent'] || 'unknown';
    const userId = request.user?.id || 'anonymous';
    const ip = request.ip || request.connection.remoteAddress;

    // Create span for the request
    const span = this.tracingService.createSpan(spanName, {
      'http.method': method,
      'http.url': url,
      'http.route': url.split('?')[0], // Remove query parameters
      'http.user_agent': userAgent,
      'http.client_ip': ip,
      'user.id': userId,
      'controller.name': controller.name,
      'handler.name': handler.name,
      'request.timestamp': Date.now(),
    });

    const startTime = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;

        span.setAttributes({
          'http.status_code': response.statusCode,
          'http.response.size': JSON.stringify(data).length,
          'response.duration_ms': duration,
          'response.success': true,
        });

        // Add performance metrics
        if (duration > 1000) {
          span.setAttributes({
            'performance.slow_request': true,
            'performance.duration_category': 'slow',
          });
          this.logger.warn(`Slow request detected: ${method} ${url} took ${duration}ms`);
        } else if (duration > 500) {
          span.setAttributes({
            'performance.duration_category': 'moderate',
          });
        } else {
          span.setAttributes({
            'performance.duration_category': 'fast',
          });
        }

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();

        this.logger.debug(`Request completed: ${method} ${url}`, {
          duration,
          statusCode: response.statusCode,
          traceId: span.spanContext().traceId,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        span.setAttributes({
          'http.status_code': response.statusCode || 500,
          'error.name': error.name,
          'error.message': error.message,
          'error.stack': error.stack,
          'response.duration_ms': duration,
          'response.success': false,
        });

        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });

        span.recordException(error);
        span.end();

        this.logger.error(`Request failed: ${method} ${url}`, {
          error: error.message,
          duration,
          statusCode: response.statusCode || 500,
          traceId: span.spanContext().traceId,
        });

        throw error;
      }),
    );
  }
}
