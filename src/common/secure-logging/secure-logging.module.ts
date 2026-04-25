import { Module, Global } from '@nestjs/common';
import { SecureLoggerService } from './secure-logger.service';
import { SecureLoggingInterceptor } from './secure-logging.interceptor';

/**
 * Secure Logging Module
 *
 * Provides secure logging services that automatically sanitize sensitive data
 * like passwords, tokens, and PII from application logs.
 *
 * This module is global, so the SecureLoggerService is available everywhere.
 */
@Global()
@Module({
  providers: [SecureLoggerService, SecureLoggingInterceptor],
  exports: [SecureLoggerService, SecureLoggingInterceptor],
})
export class SecureLoggingModule {}
