import { Injectable, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import { WinstonConfigService } from './winston.config';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  userEmail?: string;
  requestId?: string;
  method?: string;
  url?: string;
  ip?: string;
  userAgent?: string;
  controller?: string;
  handler?: string;
  duration?: number;
  statusCode?: number;
  [key: string]: any;
}

export interface ErrorLogContext extends LogContext {
  errorCode?: string;
  errorType?: string;
  stack?: string;
  originalError?: any;
}

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService {
  private readonly logger: winston.Logger;
  private context: string = 'Application';

  constructor(private readonly configService: ConfigService) {
    const winstonConfig = new WinstonConfigService(configService);
    this.logger = winstonConfig.createWinstonLogger();
  }

  setContext(context: string): void {
    this.context = context;
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: ErrorLogContext): void {
    this.log('error', message, context);
  }

  fatal(message: string, context?: ErrorLogContext): void {
    this.log('error', message, { ...context, severity: 'fatal' });
  }

  // Specialized logging methods
  logRequest(message: string, context: LogContext): void {
    this.info(message, {
      ...context,
      type: 'request',
    });
  }

  logResponse(message: string, context: LogContext): void {
    this.info(message, {
      ...context,
      type: 'response',
    });
  }

  logError(error: Error, context?: ErrorLogContext): void {
    const errorContext: ErrorLogContext = {
      ...context,
      type: 'error',
      errorType: error.constructor.name,
      stack: error.stack,
      originalError: {
        name: error.name,
        message: error.message,
      },
    };

    this.error(error.message, errorContext);
  }

  logBusinessEvent(event: string, context?: LogContext): void {
    this.info(event, {
      ...context,
      type: 'business_event',
    });
  }

  logSecurityEvent(event: string, context?: LogContext): void {
    this.warn(event, {
      ...context,
      type: 'security_event',
      severity: 'high',
    });
  }

  logPerformance(message: string, context: LogContext & { duration: number }): void {
    const level = context.duration > 5000 ? 'warn' : 'info';
    this.log(level, message, {
      ...context,
      type: 'performance',
    });
  }

  logDatabaseQuery(query: string, context: LogContext & { duration?: number }): void {
    const level = context.duration && context.duration > 1000 ? 'warn' : 'debug';
    this.log(level, 'Database Query', {
      ...context,
      type: 'database_query',
      query: this.sanitizeQuery(query),
    });
  }

  logExternalApiCall(message: string, context: LogContext): void {
    this.info(message, {
      ...context,
      type: 'external_api_call',
    });
  }

  private log(level: string, message: string, context?: LogContext): void {
    const logData = {
      message,
      context: this.context,
      timestamp: new Date().toISOString(),
      environment: this.configService.get('NODE_ENV', 'development'),
      service: this.configService.get('APP_NAME', 'strellerminds-backend'),
      version: this.configService.get('APP_VERSION', '1.0.0'),
      ...context,
    };

    this.logger.log(level, message, logData);
  }

  private sanitizeQuery(query: string): string {
    // Remove sensitive data from queries
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret='***'");
  }

  // Method to create child logger with additional context
  child(additionalContext: LogContext): LoggerService {
    const childLogger = new LoggerService(this.configService);
    childLogger.setContext(this.context);

    // Override the log method to include additional context
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level: string, message: string, context?: LogContext) => {
      originalLog(level, message, { ...additionalContext, ...context });
    };

    return childLogger;
  }
}
