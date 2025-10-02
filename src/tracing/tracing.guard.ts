import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { TRACE_OPTIONS_KEY, TraceOptions } from './tracing.decorators';
import { TracingService } from './tracing.service';

@Injectable()
export class TracingGuard implements CanActivate {
  private readonly logger = new Logger(TracingGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly tracingService: TracingService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const traceOptions = this.reflector.get<TraceOptions>(TRACE_OPTIONS_KEY, context.getHandler());

    if (!traceOptions) {
      return true; // No tracing needed
    }

    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const userId = request.user?.id || 'anonymous';

    // Create span for the traced method
    const span = this.tracingService.createSpan(
      traceOptions.name || `${context.getClass().name}.${context.getHandler().name}`,
      {
        ...traceOptions.attributes,
        'http.method': method,
        'http.url': url,
        'user.id': userId,
        'guard.name': 'TracingGuard',
      },
      traceOptions.kind,
    );

    // Add arguments to span if requested
    if (traceOptions.includeArgs) {
      const args = context.getArgs();
      span.setAttributes({
        'method.args.count': args.length,
        'method.args': JSON.stringify(args.slice(0, 3)), // Limit to first 3 args
      });
    }

    // Store span in request for later use
    request.tracingSpan = span;

    this.logger.debug(`Created tracing span for method`, {
      spanName: span.name,
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
    });

    return true;
  }

  /**
   * Complete the span after method execution
   */
  static completeSpan(request: any, result?: any, error?: Error): void {
    const span = request.tracingSpan;
    if (!span) {
      return;
    }

    try {
      if (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        span.recordException(error);
      } else {
        span.setStatus({ code: SpanStatusCode.OK });

        // Add result to span if it's small enough
        if (result && JSON.stringify(result).length < 1000) {
          span.setAttributes({
            'method.result': JSON.stringify(result),
          });
        }
      }
    } finally {
      span.end();
    }
  }
}
