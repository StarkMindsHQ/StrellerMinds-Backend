import { Injectable, Logger } from '@nestjs/common';
import { DistributedTracer } from '../logging/DistributedTracer';
import { CorrelationManager } from '../logging/CorrelationManager';
import { LogAnalyzer } from '../logging/LogAnalyzer';
import { CorrelationLoggerService } from '../logging/correlation-logger.service';

/**
 * Main Logging and Tracing Service
 * Orchestrates distributed tracing, correlation, and intelligent log analysis
 */
@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  constructor(
    private readonly tracer: DistributedTracer,
    private readonly correlationManager: CorrelationManager,
    private readonly logAnalyzer: LogAnalyzer,
    private readonly correlationLogger: CorrelationLoggerService,
  ) {}

  /**
   * Initialize a new request with a correlation context
   */
  initRequest(overrides: any = {}): void {
    const context = this.correlationManager.createContext(overrides);
    this.correlationManager.run(context, () => {
      this.tracer.startTrace('HTTP Request', context);
      this.correlationLogger.log(`[Logging Service] Initialized context for correlation: ${context.correlationId}`);
    });
  }

  /**
   * Log with correlation and tracing
   */
  log(message: string, meta: any = {}): void {
    const context = this.correlationManager.getContext();
    const traceId = context?.traceId;
    const correlationId = context?.correlationId;

    this.correlationLogger.log(message, {
      ...meta,
      traceId,
      correlationId,
    });

    // Track for analysis
    this.logAnalyzer.track({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      correlationId,
      traceId,
      metadata: meta,
    });
  }

  /**
   * Log an error with full context and tracing
   */
  error(message: string, error?: any, meta: any = {}): void {
    const context = this.correlationManager.getContext();
    const traceId = context?.traceId;
    const correlationId = context?.correlationId;

    this.correlationLogger.error(message, error?.stack, {
      ...meta,
      error_details: error,
      traceId,
      correlationId,
    });

    // Track for anomaly detection
    this.logAnalyzer.track({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      correlationId,
      traceId,
      metadata: { ...meta, error: error?.message },
    });
  }

  /**
   * Trace an operation
   */
  async traceOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const span = this.tracer.startTrace(name);
    try {
      const result = await operation();
      this.tracer.endSpan(span.id, 'success');
      return result;
    } catch (err) {
      this.tracer.endSpan(span.id, 'error', err);
      this.error(`Operation ${name} failed`, err);
      throw err;
    }
  }

  /**
   * Run log analysis
   */
  runAnalysis(): any {
    return this.logAnalyzer.analyze();
  }

  /**
   * Get correlation headers for downstream calls
   */
  getHeaders(): Record<string, string> {
    return {
      ...this.correlationManager.getPropagationHeaders(),
      ...this.tracer.getTraceContext(),
    };
  }
}
