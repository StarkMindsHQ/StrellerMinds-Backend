import { Injectable, LoggerService as NestLoggerService, Inject } from '@nestjs/common';
import * as winston from 'winston';
import { createAppLogger } from './winston.config';

/**
 * Custom Logger Service that wraps Winston for NestJS
 * Provides structured logging with context support
 */
@Injectable()
export class AppLogger implements NestLoggerService {
  private logger: winston.Logger;

  constructor(@Inject('LoggerContext') context: string) {
    this.logger = createAppLogger(context);
  }

  /**
   * Set the context for all subsequent log calls
   */
  setContext(context: string): void {
    this.logger = createAppLogger(context);
  }

  /**
   * Log a message at verbose level
   */
  verbose(message: string, meta?: any): void {
    this.logger.verbose(message, meta);
  }

  /**
   * Log a message at debug level
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  /**
   * Log a message at info level
   */
  log(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  /**
   * Log a message at warn level
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log an error with stack trace
   */
  error(message: string, trace?: string, meta?: any): void {
    if (trace) {
      this.logger.error(message, { trace, ...meta });
    } else {
      this.logger.error(message, meta);
    }
  }

  /**
   * Log API request with structured data
   */
  logApi(method: string, url: string, statusCode: number, duration: number, meta?: any): void {
    this.logger.info(`${method} ${url} ${statusCode} - ${duration}ms`, {
      type: 'api_request',
      method,
      url,
      statusCode,
      duration,
      ...meta,
    });
  }

  /**
   * Log security event
   */
  logSecurity(event: string, details: any): void {
    this.logger.warn(event, { type: 'security', ...details });
  }

  /**
   * Log business event
   */
  logBusiness(event: string, details: any): void {
    this.logger.info(event, { type: 'business', ...details });
  }

  /**
   * Log performance metric
   */
  logPerformance(operation: string, duration: number, meta?: any): void {
    this.logger.info(`Performance: ${operation} - ${duration}ms`, {
      type: 'performance',
      operation,
      duration,
      ...meta,
    });
  }
}

/**
 * Factory function to create a logger with a specific context
 */
export const createLogger = (context: string): AppLogger => {
  return new AppLogger(context);
};

// Default instance for use without dependency injection
export const appLogger = new AppLogger('App');