import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { LogEntry, LogLevel } from '../interfaces/observability.interface';
import { MonitoringConfig } from '../interfaces/monitoring-config.interface';

@Injectable()
export class CustomLoggerService implements NestLoggerService {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 10000;

  constructor(private readonly config: MonitoringConfig) {}

  log(message: any, context?: string, traceId?: string): void {
    this.writeLog(LogLevel.INFO, message, context, undefined, traceId);
  }

  error(message: any, trace?: string, context?: string, traceId?: string): void {
    this.writeLog(LogLevel.ERROR, message, context, { trace }, traceId);
  }

  warn(message: any, context?: string, traceId?: string): void {
    this.writeLog(LogLevel.WARN, message, context, undefined, traceId);
  }

  debug(message: any, context?: string, traceId?: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.writeLog(LogLevel.DEBUG, message, context, undefined, traceId);
    }
  }

  verbose(message: any, context?: string, traceId?: string): void {
    if (this.shouldLog(LogLevel.VERBOSE)) {
      this.writeLog(LogLevel.VERBOSE, message, context, undefined, traceId);
    }
  }

  private writeLog(
    level: LogLevel,
    message: any,
    context?: string,
    metadata?: Record<string, any>,
    traceId?: string
  ): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      context,
      metadata,
      traceId
    };

    this.logs.push(logEntry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Output to console based on level
    this.outputToConsole(logEntry);
  }

  private outputToConsole(logEntry: LogEntry): void {
    const timestamp = logEntry.timestamp.toISOString();
    const context = logEntry.context ? `[${logEntry.context}]` : '';
    const traceId = logEntry.traceId ? `[${logEntry.traceId}]` : '';
    const prefix = `${timestamp} ${context}${traceId}`;

    switch (logEntry.level) {
      case LogLevel.ERROR:
        console.error(`${prefix} ERROR: ${logEntry.message}`, logEntry.metadata);
        break;
      case LogLevel.WARN:
        console.warn(`${prefix} WARN: ${logEntry.message}`);
        break;
      case LogLevel.DEBUG:
        console.debug(`${prefix} DEBUG: ${logEntry.message}`);
        break;
      case LogLevel.VERBOSE:
        console.log(`${prefix} VERBOSE: ${logEntry.message}`);
        break;
      default:
        console.log(`${prefix} INFO: ${logEntry.message}`);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const configLevel = this.config.logLevel || LogLevel.INFO;
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG, LogLevel.VERBOSE];
    const configIndex = levels.indexOf(configLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex <= configIndex;
  }

  // Public methods for querying logs
  getLogs(since?: Date, level?: LogLevel, context?: string): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (since) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= since);
    }

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (context) {
      filteredLogs = filteredLogs.filter(log => log.context === context);
    }

    return filteredLogs;
  }

  getLogsByTraceId(traceId: string): LogEntry[] {
    return this.logs.filter(log => log.traceId === traceId);
  }

  getErrorLogs(since?: Date): LogEntry[] {
    return this.getLogs(since, LogLevel.ERROR);
  }

  clearLogs(): void {
    this.logs = [];
  }

  getLogStats(): { total: number; byLevel: Record<LogLevel, number> } {
    const stats = {
      total: this.logs.length,
      byLevel: {
        [LogLevel.ERROR]: 0,
        [LogLevel.WARN]: 0,
        [LogLevel.INFO]: 0,
        [LogLevel.DEBUG]: 0,
        [LogLevel.VERBOSE]: 0
      }
    };

    this.logs.forEach(log => {
      stats.byLevel[log.level]++;
    });

    return stats;
  }
}
