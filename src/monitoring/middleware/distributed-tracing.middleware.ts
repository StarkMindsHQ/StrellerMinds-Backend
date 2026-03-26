import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DistributedTracingService } from '../services/distributed-tracing.service';
import { PerformanceProfilerService } from '../services/performance-profiler.service';

/**
 * Distributed Tracing Middleware
 * Adds trace context to all HTTP requests
 */
@Injectable()
export class DistributedTracingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(DistributedTracingMiddleware.name);

  constructor(
    private tracingService: DistributedTracingService,
    private profilerService: PerformanceProfilerService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Extract trace context from headers (W3C Trace Context standard)
    const traceParent = req.headers['traceparent'];
    const traceId = this.extractTraceId(traceParent);

    // Create trace
    const trace = this.tracingService.createTrace(
      `${req.method} ${req.path}`,
      'http-request',
    );

    // Add trace context to request
    (req as any).traceId = trace;

    // Add trace headers to response
    res.setHeader('X-Trace-ID', trace);
    res.setHeader('X-B3-TraceId', trace);

    // Add tags for context
    this.tracingService.addTags(trace, {
      'http.method': req.method,
      'http.url': req.url,
      'http.target': req.path,
      'http.host': req.hostname,
      'http.scheme': req.protocol,
      'http.client_ip': this.getClientIp(req),
      'http.user_agent': req.headers['user-agent'],
    });

    const startTime = Date.now();
    const metric = `http_request_${req.method}_${req.path.split('/').filter((p) => p).join('_') || 'root'}`;

    // Track response
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = function (data: any) {
      recordMetrics();
      return originalJson(data);
    };

    res.send = function (data: any) {
      recordMetrics();
      return originalSend(data);
    };

    const recordMetrics = () => {
      const duration = Date.now() - startTime;

      // Record in profiler
      this.profilerService.recordOperation(metric, duration);

      // Add response tags
      this.tracingService.addTags(trace, {
        'http.status_code': res.statusCode,
        'http.response_time_ms': duration,
        'http.response_size': res.get('content-length') || 0,
      });

      // End span
      const status = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'error' : 'completed';
      this.tracingService.endSpan(trace, status);

      this.logger.debug(
        `[Trace: ${trace}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`,
      );
    };

    next();
  }

  /**
   * Extract trace ID from W3C traceparent header
   */
  private extractTraceId(traceparent?: string | string[]): string {
    if (traceparent && typeof traceparent === 'string') {
      const parts = traceparent.split('-');
      if (parts.length >= 3) {
        return parts[1]; // Return trace-id portion
      }
    }
    return '';
  }

  /**
   * Get client IP address
   */
  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }
}
