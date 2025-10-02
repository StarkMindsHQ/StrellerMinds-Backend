import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { TracingService } from './tracing.service';

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TracingMiddleware.name);

  constructor(private readonly tracingService: TracingService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const method = req.method;
    const url = req.url;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = req.ip || req.connection.remoteAddress;

    // Extract trace context from incoming headers
    const extractedContext = this.tracingService.extractTraceContext(req.headers);

    // Create root span for the HTTP request
    const span = this.tracingService.createSpan(`HTTP ${method}`, {
      'http.method': method,
      'http.url': url,
      'http.route': url.split('?')[0], // Remove query parameters
      'http.user_agent': userAgent,
      'http.client_ip': ip,
      'request.timestamp': startTime,
      'service.name': 'strellerminds-backend',
    });

    // Set the span in the context
    const spanContext = trace.setSpan(extractedContext, span);
    context.with(spanContext, () => {
      // Add trace ID to response headers for client correlation
      res.setHeader('X-Trace-ID', span.spanContext().traceId);
      res.setHeader('X-Span-ID', span.spanContext().spanId);

      // Track request body size if available
      if (req.headers['content-length']) {
        span.setAttributes({
          'http.request.body.size': parseInt(req.headers['content-length'], 10),
        });
      }

      // Track query parameters
      if (Object.keys(req.query).length > 0) {
        span.setAttributes({
          'http.request.query.count': Object.keys(req.query).length,
        });
      }

      // Track route parameters
      if (Object.keys(req.params).length > 0) {
        span.setAttributes({
          'http.request.params.count': Object.keys(req.params).length,
          'http.request.params': JSON.stringify(req.params),
        });
      }

      // Override res.end to capture response metrics
      const originalEnd = res.end;
      res.end = function (chunk?: any, encoding?: any) {
        const duration = Date.now() - startTime;

        span.setAttributes({
          'http.status_code': res.statusCode,
          'http.response.duration_ms': duration,
          'http.response.size': res.getHeader('content-length') || 0,
        });

        // Add performance categorization
        if (duration > 1000) {
          span.setAttributes({
            'performance.slow_request': true,
            'performance.duration_category': 'slow',
          });
        } else if (duration > 500) {
          span.setAttributes({
            'performance.duration_category': 'moderate',
          });
        } else {
          span.setAttributes({
            'performance.duration_category': 'fast',
          });
        }

        // Set status based on response code
        if (res.statusCode >= 400) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `HTTP ${res.statusCode}`,
          });
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }

        span.end();

        // Call original end
        originalEnd.call(this, chunk, encoding);
      };

      // Handle errors
      req.on('error', (error) => {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        span.recordException(error);
        span.end();
      });

      next();
    });
  }
}
