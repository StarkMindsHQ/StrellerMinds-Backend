import { Module, Global, NestModule, MiddlewareConsumer, Inject } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppLogger } from './logger.service';
import { LoggingInterceptor } from './logging.interceptor';
import { CorrelationManager } from './CorrelationManager';
import { DistributedTracer } from './DistributedTracer';
import { LogAnalyzer } from './LogAnalyzer';
import { LoggingService } from '../services/LoggingService';
import { CorrelationLoggerService } from './correlation-logger.service';

/**
 * Logging Module providing centralized logging for the application
 * Use @Global() to make it available across all modules
 */
@Global()
@Module({
  providers: [
    AppLogger,
    CorrelationManager,
    DistributedTracer,
    LogAnalyzer,
    LoggingService,
    CorrelationLoggerService,
    {
      provide: 'LoggerContext',
      useValue: 'Application', // Default context value
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [
    AppLogger,
    CorrelationManager,
    DistributedTracer,
    LogAnalyzer,
    LoggingService,
    CorrelationLoggerService,
  ],
})
export class LoggingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Can add middleware here if needed
  }
}

/**
 * Custom decorator for injecting logger with context
 */
export function InjectLogger(context?: string) {
  return Inject(AppLogger);
}
