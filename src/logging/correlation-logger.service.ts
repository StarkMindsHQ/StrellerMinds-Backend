import { Injectable, Inject, Optional } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import * as winston from 'winston';
import { createAppLogger } from './winston.config';
import { v4 as uuidv4 } from 'uuid';

/**
 * Correlation ID interface for request context
 */
export interface CorrelationContext {
  correlationId: string;
  requestId: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  sessionId?: string;
}

/**
 * Extended Winston logger with correlation support
 */
export interface CorrelatedLogger extends winston.Logger {
  correlate(context: CorrelationContext): CorrelatedLogger;
  child(metadata?: Record<string, any>): CorrelatedLogger;
}

/**
 * Logger Service with correlation ID support
 * Provides structured logging across the application
 */
@Injectable()
export class CorrelationLoggerService {
  private logger: winston.Logger;

  constructor(@Optional() @Inject(REQUEST) private readonly request?: Request) {
    this.logger = createAppLogger('Default');
  }

  /**
   * Get or create correlation context from request
   */
  private getCorrelationContext(): CorrelationContext {
    if (!this.request) {
      return {
        correlationId: uuidv4(),
        requestId: uuidv4(),
      };
    }

    // Extract from request headers or generate new
    const correlationId =
      (this.request.headers['x-correlation-id'] as string) ||
      (this.request.headers['x-request-id'] as string) ||
      uuidv4();

    const traceId = this.request.headers['traceparent'] as string;
    const userId = (this.request as any).user?.id;
    const sessionId = this.request.headers['x-session-id'] as string;

    return {
      correlationId,
      requestId: uuidv4(),
      traceId: traceId ? traceId.split('-')[1] : undefined,
      userId,
      sessionId,
    };
  }

  /**
   * Create a correlated logger instance
   */
  correlate(context?: Partial<CorrelationContext>): CorrelatedLogger {
    const correlationContext = { ...this.getCorrelationContext(), ...context };

    const childLogger = this.logger.child({
      correlationId: correlationContext.correlationId,
      requestId: correlationContext.requestId,
      traceId: correlationContext.traceId,
      userId: correlationContext.userId,
      sessionId: correlationContext.sessionId,
    });

    // Add correlate method to child logger
    (childLogger as any).correlate = (newContext: Partial<CorrelationContext>) => {
      return this.correlate({ ...correlationContext, ...newContext });
    };

    return childLogger as CorrelatedLogger;
  }

  /**
   * Log at verbose level with correlation
   */
  verbose(message: string, meta?: any): void {
    const logger = this.correlate();
    logger.verbose(message, meta);
  }

  /**
   * Log at debug level with correlation
   */
  debug(message: string, meta?: any): void {
    const logger = this.correlate();
    logger.debug(message, meta);
  }

  /**
   * Log at info level with correlation
   */
  log(message: string, meta?: any): void {
    const logger = this.correlate();
    logger.info(message, meta);
  }

  /**
   * Log at warn level with correlation
   */
  warn(message: string, meta?: any): void {
    const logger = this.correlate();
    logger.warn(message, meta);
  }

  /**
   * Log error with correlation and stack trace
   */
  error(message: string, trace?: string, meta?: any): void {
    const logger = this.correlate();
    logger.error(message, {
      trace,
      stack: trace,
      ...meta,
    });
  }

  /**
   * Log API request with full context
   */
  logApiRequest(
    method: string,
    url: string,
    statusCode: number,
    durationMs: number,
    additionalMeta?: any,
  ): void {
    const context = this.getCorrelationContext();
    
    this.logger.info('API Request', {
      type: 'api_request',
      correlationId: context.correlationId,
      requestId: context.requestId,
      method,
      url,
      statusCode,
      durationMs,
      userAgent: this.request?.headers['user-agent'],
      ip: this.request?.headers['x-real-ip'] || this.request?.socket?.remoteAddress,
      ...additionalMeta,
    });
  }

  /**
   * Log database query with performance metrics
   */
  logDatabaseQuery(
    query: string,
    durationMs: number,
    parameters?: any[],
    additionalMeta?: any,
  ): void {
    const context = this.getCorrelationContext();
    
    this.logger.debug('Database Query', {
      type: 'database_query',
      correlationId: context.correlationId,
      query: this.sanitizeQuery(query),
      durationMs,
      parameterCount: parameters?.length || 0,
      ...additionalMeta,
    });
  }

  /**
   * Log security event
   */
  logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any): void {
    const context = this.getCorrelationContext();
    
    this.logger.warn(`Security Event: ${event}`, {
      type: 'security',
      severity,
      correlationId: context.correlationId,
      userId: context.userId,
      ip: this.request?.headers['x-real-ip'] || this.request?.socket?.remoteAddress,
      ...details,
    });
  }

  /**
   * Log business event
   */
  logBusiness(event: string, category: string, data: any): void {
    const context = this.getCorrelationContext();
    
    this.logger.info(`Business Event: ${event}`, {
      type: 'business',
      category,
      correlationId: context.correlationId,
      userId: context.userId,
      ...data,
    });
  }

  /**
   * Log performance metric
   */
  logPerformance(
    operation: string,
    durationMs: number,
    metrics?: { [key: string]: number },
    additionalMeta?: any,
  ): void {
    const context = this.getCorrelationContext();
    
    this.logger.info(`Performance: ${operation}`, {
      type: 'performance',
      correlationId: context.correlationId,
      operation,
      durationMs,
      metrics,
      ...additionalMeta,
    });
  }

  /**
   * Log external service call
   */
  logExternalService(
    serviceName: string,
    operation: string,
    durationMs: number,
    success: boolean,
    metadata?: any,
  ): void {
    const context = this.getCorrelationContext();
    
    this.logger.info(`External Service: ${serviceName}`, {
      type: 'external_service',
      correlationId: context.correlationId,
      serviceName,
      operation,
      durationMs,
      success,
      ...metadata,
    });
  }

  /**
   * Sanitize database query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    // Remove or redact sensitive information
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='[REDACTED]'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='[REDACTED]'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret='[REDACTED]'")
      .substring(0, 1000); // Truncate long queries
  }

  /**
   * Set tags for all subsequent logs in this context
   */
  setTags(tags: Record<string, any>): void {
    this.logger = this.logger.child(tags);
  }
}

/**
 * Log level filter utility
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4,
}

/**
 * Filter logs based on level
 */
export const shouldLog = (level: LogLevel, currentLevel: LogLevel): boolean => {
  return level <= currentLevel;
};
