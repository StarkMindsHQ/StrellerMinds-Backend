import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Span context for distributed tracing
 */
export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  timestamp: number;
  duration?: number;
  tags: Record<string, any>;
  logs: Array<{ timestamp: number; message: string; level: string }>;
  status: 'pending' | 'completed' | 'error';
  error?: Error;
  operation: string;
  service: string;
  environment: string;
}

/**
 * Distributed Tracing Service
 * Implements distributed tracing across service boundaries
 */
@Injectable()
export class DistributedTracingService {
  private readonly logger = new Logger(DistributedTracingService.name);
  private activeSpans = new Map<string, SpanContext>();
  private completedSpans: SpanContext[] = [];
  private readonly maxSpansBuffer = 10000;
  private traceContextStorage: Map<string, SpanContext> = new Map();

  constructor(private eventEmitter: EventEmitter2) {}

  /**
   * Create a new trace
   */
  createTrace(operation: string, service: string): string {
    const traceId = uuidv4();
    const spanContext: SpanContext = {
      traceId,
      spanId: uuidv4(),
      timestamp: Date.now(),
      tags: {},
      logs: [],
      status: 'pending',
      operation,
      service,
      environment: process.env.NODE_ENV || 'unknown',
    };

    this.activeSpans.set(traceId, spanContext);
    return traceId;
  }

  /**
   * Start a child span within a trace
   */
  startSpan(
    traceId: string,
    operation: string,
    service: string = 'default',
  ): string {
    const parentSpan = this.activeSpans.get(traceId);
    if (!parentSpan) {
      this.logger.warn(`Parent trace ${traceId} not found for span ${operation}`);
      return this.createTrace(operation, service);
    }

    const spanId = uuidv4();
    const spanContext: SpanContext = {
      traceId,
      spanId,
      parentSpanId: parentSpan.spanId,
      timestamp: Date.now(),
      tags: {},
      logs: [],
      status: 'pending',
      operation,
      service,
      environment: process.env.NODE_ENV || 'unknown',
    };

    this.traceContextStorage.set(spanId, spanContext);
    return spanId;
  }

  /**
   * End a span
   */
  endSpan(
    spanId: string,
    status: 'completed' | 'error' = 'completed',
    error?: Error,
  ): void {
    const span = this.traceContextStorage.get(spanId) || this.activeSpans.get(spanId);
    if (!span) {
      this.logger.warn(`Span ${spanId} not found`);
      return;
    }

    span.status = status;
    span.duration = Date.now() - span.timestamp;
    if (error) {
      span.error = error;
    }

    // Move to completed spans
    this.activeSpans.delete(spanId);
    this.completedSpans.push(span);

    // Maintain buffer size
    if (this.completedSpans.length > this.maxSpansBuffer) {
      this.completedSpans.shift();
    }

    // Emit event
    this.eventEmitter.emit('span.completed', span);
  }

  /**
   * Add tag to span
   */
  addTag(spanId: string, key: string, value: any): void {
    const span = this.traceContextStorage.get(spanId) || this.activeSpans.get(spanId);
    if (span) {
      span.tags[key] = value;
    }
  }

  /**
   * Add multiple tags to span
   */
  addTags(spanId: string, tags: Record<string, any>): void {
    const span = this.traceContextStorage.get(spanId) || this.activeSpans.get(spanId);
    if (span) {
      Object.assign(span.tags, tags);
    }
  }

  /**
   * Log message in span
   */
  log(spanId: string, message: string, level: 'debug' | 'info' | 'warn' | 'error' = 'info'): void {
    const span = this.traceContextStorage.get(spanId) || this.activeSpans.get(spanId);
    if (span) {
      span.logs.push({
        timestamp: Date.now(),
        message,
        level,
      });
    }
  }

  /**
   * Get span by ID
   */
  getSpan(spanId: string): SpanContext | undefined {
    return this.traceContextStorage.get(spanId) || this.activeSpans.get(spanId);
  }

  /**
   * Get all spans for a trace
   */
  getTraceSpans(traceId: string): SpanContext[] {
    const allSpans = [
      ...this.activeSpans.values(),
      ...this.traceContextStorage.values(),
      ...this.completedSpans,
    ];
    return allSpans.filter((span) => span.traceId === traceId);
  }

  /**
   * Get active spans
   */
  getActiveSpans(): SpanContext[] {
    return Array.from(this.activeSpans.values());
  }

  /**
   * Get completed spans (last N)
   */
  getCompletedSpans(limit: number = 100): SpanContext[] {
    return this.completedSpans.slice(-limit);
  }

  /**
   * Export span as OpenTelemetry-compatible format
   */
  exportSpan(span: SpanContext): Record<string, any> {
    return {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      name: span.operation,
      kind: 'INTERNAL',
      startTime: span.timestamp,
      endTime: span.timestamp + (span.duration || 0),
      duration: span.duration || 0,
      status: {
        code: span.status === 'completed' ? 0 : span.status === 'error' ? 2 : 0,
        message: span.error?.message || '',
      },
      attributes: {
        ...span.tags,
        'service.name': span.service,
        'deployment.environment': span.environment,
      },
      events: span.logs.map((log) => ({
        timestamp: log.timestamp,
        name: log.message,
        attributes: {
          'log.level': log.level,
        },
      })),
    };
  }

  /**
   * Get trace statistics
   */
  getTraceStats(traceId: string): {
    totalSpans: number;
    completedSpans: number;
    errorSpans: number;
    totalDuration: number;
    avgDuration: number;
  } {
    const spans = this.getTraceSpans(traceId);
    const completedSpans = spans.filter((s) => s.status === 'completed');
    const errorSpans = spans.filter((s) => s.status === 'error');
    const totalDuration = spans.reduce((sum, s) => sum + (s.duration || 0), 0);

    return {
      totalSpans: spans.length,
      completedSpans: completedSpans.length,
      errorSpans: errorSpans.length,
      totalDuration,
      avgDuration: completedSpans.length > 0 ? totalDuration / completedSpans.length : 0,
    };
  }

  /**
   * Clear old spans
   */
  clearOldSpans(olderThanMs: number = 3600000): number { // 1 hour default
    const cutoffTime = Date.now() - olderThanMs;
    const initialLength = this.completedSpans.length;

    this.completedSpans = this.completedSpans.filter((span) => span.timestamp > cutoffTime);
    const removed = initialLength - this.completedSpans.length;

    this.logger.debug(`Cleared ${removed} old spans`);
    return removed;
  }
}
