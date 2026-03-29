import { Injectable, Scope } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Correlation Context Interface
 */
export interface CorrelationContext {
  correlationId: string;
  requestId: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  tenantId?: string;
  source?: string;
  timestamp: string;
}

/**
 * Manager for handling request correlation across asynchronous flows
 */
@Injectable({ scope: Scope.DEFAULT })
export class CorrelationManager {
  private static readonly localStorage = new AsyncLocalStorage<CorrelationContext>();

  /**
   * Run a function within a correlation context
   */
  run<T>(context: CorrelationContext, fn: () => T): T {
    return CorrelationManager.localStorage.run(context, fn);
  }

  /**
   * Get the current correlation context
   */
  getContext(): CorrelationContext | undefined {
    return CorrelationManager.localStorage.getStore();
  }

  /**
   * Create a new correlation context from a request or generate a new one
   */
  createContext(overrides: Partial<CorrelationContext> = {}): CorrelationContext {
    return {
      correlationId: overrides.correlationId || uuidv4(),
      requestId: overrides.requestId || uuidv4(),
      traceId: overrides.traceId,
      spanId: overrides.spanId,
      userId: overrides.userId,
      tenantId: overrides.tenantId,
      source: overrides.source || 'streller-minds-backend',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get correlation ID from the current context
   */
  getCorrelationId(): string {
    return this.getContext()?.correlationId || uuidv4();
  }

  /**
   * Extend the current context with new data
   */
  extendContext(updates: Partial<CorrelationContext>): void {
    const currentContext = this.getContext();
    if (currentContext) {
      Object.assign(currentContext, updates);
    }
  }

  /**
   * Generate header objects for cross-service propagation
   */
  getPropagationHeaders(): Record<string, string> {
    const context = this.getContext();
    if (!context) return {};

    const headers: Record<string, string> = {
      'x-correlation-id': context.correlationId,
      'x-request-id': context.requestId,
    };

    if (context.traceId) headers['x-trace-id'] = context.traceId;
    if (context.spanId) headers['x-span-id'] = context.spanId;
    if (context.tenantId) headers['x-tenant-id'] = context.tenantId;

    return headers;
  }
}
