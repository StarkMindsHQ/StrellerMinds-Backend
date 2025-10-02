import { Injectable, Logger } from '@nestjs/common';
import { trace, context, SpanKind, SpanStatusCode, Span } from '@opentelemetry/api';
import { TracingConfigService } from './tracing.config';

@Injectable()
export class TracingService {
  private readonly logger = new Logger(TracingService.name);
  private readonly tracer = trace.getTracer('strellerminds-backend');

  constructor(private readonly tracingConfigService: TracingConfigService) {}

  /**
   * Create a new span for business operations
   */
  createSpan(
    name: string,
    attributes: Record<string, any> = {},
    kind: SpanKind = SpanKind.INTERNAL,
  ): Span {
    const span = this.tracer.startSpan(name, {
      kind,
      attributes: {
        'service.name': this.tracingConfigService.getConfig().serviceName,
        ...attributes,
      },
    });

    this.logger.debug(`Created span: ${name}`, { spanId: span.spanContext().spanId });
    return span;
  }

  /**
   * Execute a function within a span
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    attributes: Record<string, any> = {},
    kind: SpanKind = SpanKind.INTERNAL,
  ): Promise<T> {
    const span = this.createSpan(name, attributes, kind);

    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Create a span for external service calls
   */
  createExternalServiceSpan(
    serviceName: string,
    operation: string,
    attributes: Record<string, any> = {},
  ): Span {
    return this.createSpan(
      `${serviceName}.${operation}`,
      {
        'service.type': 'external',
        'service.name': serviceName,
        'operation.name': operation,
        ...attributes,
      },
      SpanKind.CLIENT,
    );
  }

  /**
   * Create a span for database operations
   */
  createDatabaseSpan(
    operation: string,
    table?: string,
    attributes: Record<string, any> = {},
  ): Span {
    return this.createSpan(
      `db.${operation}`,
      {
        'db.system': 'postgresql',
        'db.operation': operation,
        'db.sql.table': table,
        ...attributes,
      },
      SpanKind.CLIENT,
    );
  }

  /**
   * Create a span for message queue operations
   */
  createQueueSpan(
    queueName: string,
    operation: string,
    attributes: Record<string, any> = {},
  ): Span {
    return this.createSpan(
      `queue.${queueName}.${operation}`,
      {
        'messaging.system': 'redis',
        'messaging.destination': queueName,
        'messaging.operation': operation,
        ...attributes,
      },
      SpanKind.CLIENT,
    );
  }

  /**
   * Add attributes to the current active span
   */
  addAttributes(attributes: Record<string, any>): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttributes(attributes);
    }
  }

  /**
   * Add an event to the current active span
   */
  addEvent(name: string, attributes: Record<string, any> = {}): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent(name, attributes);
    }
  }

  /**
   * Set the status of the current active span
   */
  setStatus(code: SpanStatusCode, message?: string): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setStatus({ code, message });
    }
  }

  /**
   * Record an exception in the current active span
   */
  recordException(exception: Error, attributes: Record<string, any> = {}): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.recordException(exception, attributes);
    }
  }

  /**
   * Get the current trace ID
   */
  getCurrentTraceId(): string | undefined {
    const activeSpan = trace.getActiveSpan();
    return activeSpan?.spanContext().traceId;
  }

  /**
   * Get the current span ID
   */
  getCurrentSpanId(): string | undefined {
    const activeSpan = trace.getActiveSpan();
    return activeSpan?.spanContext().spanId;
  }

  /**
   * Create a child span with automatic context propagation
   */
  createChildSpan(
    name: string,
    attributes: Record<string, any> = {},
    kind: SpanKind = SpanKind.INTERNAL,
  ): Span {
    const parentSpan = trace.getActiveSpan();
    const span = this.tracer.startSpan(
      name,
      {
        kind,
        attributes: {
          'service.name': this.tracingConfigService.getConfig().serviceName,
          ...attributes,
        },
      },
      parentSpan ? trace.setSpan(context.active(), parentSpan) : undefined,
    );

    this.logger.debug(`Created child span: ${name}`, {
      spanId: span.spanContext().spanId,
      traceId: span.spanContext().traceId,
    });

    return span;
  }

  /**
   * Extract trace context from headers for distributed tracing
   */
  extractTraceContext(headers: Record<string, string | string[]>): any {
    return trace.propagation.extract(context.active(), headers);
  }

  /**
   * Inject trace context into headers for distributed tracing
   */
  injectTraceContext(carrier: Record<string, string>): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      trace.propagation.inject(trace.setSpan(context.active(), activeSpan), carrier);
    }
  }

  /**
   * Create a span for blockchain operations
   */
  createBlockchainSpan(
    blockchain: string,
    operation: string,
    attributes: Record<string, any> = {},
  ): Span {
    return this.createSpan(
      `blockchain.${blockchain}.${operation}`,
      {
        'blockchain.name': blockchain,
        'blockchain.operation': operation,
        ...attributes,
      },
      SpanKind.CLIENT,
    );
  }

  /**
   * Create a span for file operations
   */
  createFileSpan(operation: string, fileName?: string, attributes: Record<string, any> = {}): Span {
    return this.createSpan(
      `file.${operation}`,
      {
        'file.operation': operation,
        'file.name': fileName,
        ...attributes,
      },
      SpanKind.CLIENT,
    );
  }
}
