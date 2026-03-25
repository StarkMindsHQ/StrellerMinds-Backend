import { Module, Global, NestModule, MiddlewareConsumer, Inject } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppLogger } from './logger.service';
import { LoggingInterceptor } from './logging.interceptor';

/**
 * Logging Module providing centralized logging for the application
 * Use @Global() to make it available across all modules
 */
@Global()
@Module({
  providers: [
    AppLogger,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [AppLogger],
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