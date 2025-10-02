import { Injectable } from '@nestjs/common';
import { SentryConfigService } from './sentry.config';
import { LoggerService, ErrorLogContext } from '../logging/logger.service';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryService {
  constructor(
    private readonly sentryConfig: SentryConfigService,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.setContext('SentryService');
  }

  captureError(error: Error, context?: ErrorLogContext): string {
    try {
      // Log to our internal logging system first
      this.loggerService.logError(error, context);

      // Then send to Sentry
      const sentryId = this.sentryConfig.captureException(error, {
        component: context?.controller || context?.context || 'unknown',
        correlationId: context?.correlationId,
        user: context?.userId
          ? {
              id: context.userId,
              email: context.userEmail,
            }
          : undefined,
        request: {
          method: context?.method,
          url: context?.url,
          ip: context?.ip,
          userAgent: context?.userAgent,
        },
        additional: {
          errorCode: context?.errorCode,
          statusCode: context?.statusCode,
          duration: context?.duration,
        },
      });

      if (sentryId) {
        this.loggerService.debug('Error sent to Sentry', {
          sentryId,
          correlationId: context?.correlationId,
        });
      }

      return sentryId;
    } catch (sentryError) {
      this.loggerService.error('Failed to send error to Sentry', {
        error: sentryError.message,
        originalError: error.message,
        correlationId: context?.correlationId,
      });
      return '';
    }
  }

  captureMessage(
    message: string,
    level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info',
    context?: any,
  ): string {
    try {
      const sentryLevel = this.mapLogLevelToSentry(level);

      const sentryId = this.sentryConfig.captureMessage(message, sentryLevel, {
        component: context?.component || 'unknown',
        correlationId: context?.correlationId,
        user: context?.userId
          ? {
              id: context.userId,
              email: context.userEmail,
            }
          : undefined,
        ...context,
      });

      if (sentryId) {
        this.loggerService.debug('Message sent to Sentry', {
          sentryId,
          level,
          correlationId: context?.correlationId,
        });
      }

      return sentryId;
    } catch (sentryError) {
      this.loggerService.error('Failed to send message to Sentry', {
        error: sentryError.message,
        originalMessage: message,
        correlationId: context?.correlationId,
      });
      return '';
    }
  }

  setUserContext(userId: string, userEmail?: string): void {
    try {
      this.sentryConfig.setUserContext({
        id: userId,
        email: userEmail,
      });

      this.loggerService.debug('User context set in Sentry', {
        userId,
        userEmail: userEmail ? '***' : undefined,
      });
    } catch (error) {
      this.loggerService.error('Failed to set user context in Sentry', {
        error: error.message,
        userId,
      });
    }
  }

  addBreadcrumb(
    message: string,
    category: string,
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
    data?: any,
  ): void {
    try {
      this.sentryConfig.addBreadcrumb({
        message,
        category,
        level: this.mapLogLevelToSentry(level),
        data,
        timestamp: Date.now() / 1000,
      });
    } catch (error) {
      this.loggerService.error('Failed to add breadcrumb to Sentry', {
        error: error.message,
        message,
        category,
      });
    }
  }

  setRequestContext(correlationId: string, method: string, url: string, ip?: string): void {
    try {
      this.sentryConfig.setContext('request', {
        correlationId,
        method,
        url,
        ip,
        timestamp: new Date().toISOString(),
      });

      this.addBreadcrumb(`${method} ${url}`, 'http', 'info', {
        correlationId,
        ip,
      });
    } catch (error) {
      this.loggerService.error('Failed to set request context in Sentry', {
        error: error.message,
        correlationId,
        method,
        url,
      });
    }
  }

  captureBusinessEvent(event: string, context?: any): void {
    try {
      this.captureMessage(`Business Event: ${event}`, 'info', {
        ...context,
        type: 'business_event',
      });

      this.addBreadcrumb(event, 'business', 'info', context);
    } catch (error) {
      this.loggerService.error('Failed to capture business event in Sentry', {
        error: error.message,
        event,
      });
    }
  }

  captureSecurityEvent(event: string, context?: any): void {
    try {
      this.captureMessage(`Security Event: ${event}`, 'warning', {
        ...context,
        type: 'security_event',
        severity: 'high',
      });

      this.addBreadcrumb(event, 'security', 'warning', context);
    } catch (error) {
      this.loggerService.error('Failed to capture security event in Sentry', {
        error: error.message,
        event,
      });
    }
  }

  private mapLogLevelToSentry(level: string): Sentry.SeverityLevel {
    switch (level) {
      case 'debug':
        return 'debug';
      case 'info':
        return 'info';
      case 'warning':
      case 'warn':
        return 'warning';
      case 'error':
        return 'error';
      case 'fatal':
        return 'fatal';
      default:
        return 'info';
    }
  }

  isEnabled(): boolean {
    return this.sentryConfig.getConfig().enabled;
  }
}
