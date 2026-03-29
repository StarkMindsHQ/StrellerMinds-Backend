import { Injectable, Logger } from '@nestjs/common';
import { CorrelationManager, CorrelationContext } from './CorrelationManager';
import { v4 as uuidv4 } from 'uuid';

/**
 * Span Interface
 */
interface Span {
  id: string;
  name: string;
  startTime: number;
  parentId?: string;
  traceId: string;
  tags?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Distributed Tracer Service
 * Manages spans and trace context propagation across distributed services
 */
@Injectable()
export class DistributedTracer {
  private readonly logger = new Logger(DistributedTracer.name);
  private currentSpans: Map<string, Span> = new Map();

  constructor(private readonly correlationManager: CorrelationManager) {}

  /**
   * Start a new trace or continue an existing one
   */
  startTrace(name: string, context?: Partial<CorrelationContext>): Span {
    const traceId = context?.traceId || uuidv4();
    const parentId = context?.spanId;
    const spanId = uuidv4();

    const span: Span = {
      id: spanId,
      traceId,
      parentId,
      name,
      startTime: Date.now(),
      tags: {},
      metadata: {},
    };

    this.currentSpans.set(spanId, span);

    // Update correlation manager with newest trace/span info
    this.correlationManager.extendContext({
      traceId,
      spanId,
    });

    this.logger.debug(`[Distributed Tracer] Started span ${name} (${spanId}) in trace ${traceId}`);
    return span;
  }

  /**
   * End a span and record its duration
   */
  endSpan(spanId: string, status: 'success' | 'error' = 'success', errorDetails?: any): void {
    const span = this.currentSpans.get(spanId);
    if (!span) {
      this.logger.warn(`[Distributed Tracer] Span ${spanId} not found or already ended`);
      return;
    }

    const duration = Date.now() - span.startTime;
    const endTimestamp = new Date().toISOString();

    const completionRecord = {
      ...span,
      duration,
      endTime: endTimestamp,
      status,
      error: errorDetails,
      correlationId: this.correlationManager.getCorrelationId(),
    };

    // Log the completed span for aggregation
    this.logger.log(`[Trace Record] ${span.name} completed`, {
      trace_record: completionRecord,
    });

    this.currentSpans.delete(spanId);
  }

  /**
   * Add tags to current active span
   */
  addTags(spanId: string, tags: Record<string, any>): void {
    const span = this.currentSpans.get(spanId);
    if (span) {
      span.tags = { ...span.tags, ...tags };
    }
  }

  /**
   * Monitor performance impact of a transaction
   */
  monitorPerformanceImpact(spanId: string, metrics: Record<string, number>): void {
    const span = this.currentSpans.get(spanId);
    if (span) {
      this.logger.log(`[Performance Monitoring] Impact for ${span.name}`, {
        spanId,
        traceId: span.traceId,
        metrics,
      });
    }
  }

  /**
   * Get current trace environment for cross-service calls
   */
  getTraceContext(): Record<string, string> {
    const context = this.correlationManager.getContext();
    return {
      'x-trace-id': context?.traceId || uuidv4(),
      'x-span-id': context?.spanId || uuidv4(),
    };
  }
}
