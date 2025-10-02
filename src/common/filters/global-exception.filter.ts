import {
  Catch,
  ArgumentsHost,
  HttpException,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import { ErrorCode } from '../errors/error-codes.enum';
import { ErrorResponseDto } from '../errors/error-response.dto';
import { ValidationError } from 'class-validator';
import { CustomException } from '../errors/custom.exception';
import { LoggerService, ErrorLogContext } from '../logging/logger.service';
import { SentryService } from '../sentry/sentry.service';
import { AlertingService } from '../alerting/alerting.service';
import { v4 as uuidv4 } from 'uuid';
import { ErrorDashboardService } from '../../error-dashboard/error-dashboard.service';

@Catch()
export class GlobalExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionsFilter.name);

  constructor(
    private readonly i18n: I18nService,
    private readonly loggerService: LoggerService,
    private readonly sentryService: SentryService,
    private readonly alertingService: AlertingService,
    private readonly errorDashboardService: ErrorDashboardService,
  ) {
    this.loggerService.setContext('GlobalExceptionsFilter');
  }

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const lang = request.acceptsLanguages(['en', 'fr']) || 'en';

    // Generate correlation ID if not present
    const correlationId = (request.headers['x-correlation-id'] as string) || uuidv4();

    // Extract user context
    const user = (request as any).user;
    const userContext = user
      ? {
          userId: user.id,
          userEmail: user.email,
        }
      : {};

    // Build error context
    const errorContext: ErrorLogContext = {
      correlationId,
      ...userContext,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.get('User-Agent'),
      requestId: request.headers['x-request-id'] as string,
      timestamp: new Date().toISOString(),
      // Add additional context for better error tracking
      referer: request.get('Referer'),
      contentType: request.get('Content-Type'),
      contentLength: request.get('Content-Length'),
      acceptLanguage: request.get('Accept-Language'),
    };

    let errorResponse: ErrorResponseDto;

    if (exception instanceof CustomException) {
      const exceptionResponse = exception.getResponse() as any;
      errorResponse = {
        errorCode: exceptionResponse.errorCode,
        statusCode: exception.getStatus(),
        message: await this.i18n.translate(`errors.${exceptionResponse.errorCode}`, {
          lang,
          args: exceptionResponse.args,
        }),
        details: exceptionResponse.details,
        timestamp: new Date().toISOString(),
        path: request.url,
        correlationId,
      };

      // Log custom exception with context
      this.loggerService.error('Custom Exception', {
        ...errorContext,
        errorCode: exceptionResponse.errorCode,
        errorType: 'CustomException',
        errorCategory: this.categorizeError(exceptionResponse.errorCode),
        statusCode: exception.getStatus(),
        details: exceptionResponse.details,
      });

      // Add to error dashboard
      await this.errorDashboardService.addErrorLog({
        correlationId,
        errorCode: exceptionResponse.errorCode,
        message: await this.i18n.translate(`errors.${exceptionResponse.errorCode}`, {
          lang,
          args: exceptionResponse.args,
        }),
        statusCode: exception.getStatus(),
        timestamp: new Date().toISOString(),
        endpoint: request.url,
        method: request.method,
        userId: user?.id,
        userAgent: request.get('User-Agent'),
        ip: request.ip,
        severity: this.getSeverityForErrorCode(exceptionResponse.errorCode),
        category: this.categorizeError(exceptionResponse.errorCode),
        context: {
          ...errorContext,
          details: exceptionResponse.details,
        },
      });
    } else if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse() as any;

      // Handle class-validator validation errors
      if (Array.isArray(exceptionResponse.message)) {
        errorResponse = {
          errorCode: ErrorCode.INVALID_INPUT,
          statusCode: exception.getStatus(),
          message: await this.i18n.translate('errors.INVALID_INPUT', { lang }),
          details: this.formatValidationErrors(exceptionResponse.message),
          timestamp: new Date().toISOString(),
          path: request.url,
          correlationId,
        };

        // Log validation error
        this.loggerService.warn('Validation Error', {
          ...errorContext,
          errorCode: ErrorCode.INVALID_INPUT,
          errorType: 'ValidationError',
          errorCategory: this.categorizeError(ErrorCode.INVALID_INPUT),
          statusCode: exception.getStatus(),
          validationErrors: exceptionResponse.message,
        });

        // Add to error dashboard
        await this.errorDashboardService.addErrorLog({
          correlationId,
          errorCode: ErrorCode.INVALID_INPUT,
          message: await this.i18n.translate('errors.INVALID_INPUT', { lang }),
          statusCode: exception.getStatus(),
          timestamp: new Date().toISOString(),
          endpoint: request.url,
          method: request.method,
          userId: user?.id,
          userAgent: request.get('User-Agent'),
          ip: request.ip,
          severity: this.getSeverityForErrorCode(ErrorCode.INVALID_INPUT),
          category: this.categorizeError(ErrorCode.INVALID_INPUT),
          context: {
            ...errorContext,
            validationErrors: exceptionResponse.message,
          },
        });
      } else {
        errorResponse = {
          errorCode: ErrorCode.INTERNAL_ERROR,
          statusCode: exception.getStatus(),
          message:
            exceptionResponse.message ||
            (await this.i18n.translate('errors.INTERNAL_ERROR', { lang })),
          timestamp: new Date().toISOString(),
          path: request.url,
          correlationId,
        };

        // Log HTTP exception
        this.loggerService.error('HTTP Exception', {
          ...errorContext,
          errorCode: ErrorCode.INTERNAL_ERROR,
          errorType: 'HttpException',
          errorCategory: this.categorizeError(ErrorCode.INTERNAL_ERROR),
          statusCode: exception.getStatus(),
          originalMessage: exceptionResponse.message,
        });

        // Add to error dashboard
        await this.errorDashboardService.addErrorLog({
          correlationId,
          errorCode: ErrorCode.INTERNAL_ERROR,
          message:
            exceptionResponse.message ||
            (await this.i18n.translate('errors.INTERNAL_ERROR', { lang })),
          statusCode: exception.getStatus(),
          timestamp: new Date().toISOString(),
          endpoint: request.url,
          method: request.method,
          userId: user?.id,
          userAgent: request.get('User-Agent'),
          ip: request.ip,
          severity: this.getSeverityForErrorCode(ErrorCode.INTERNAL_ERROR),
          category: this.categorizeError(ErrorCode.INTERNAL_ERROR),
          context: {
            ...errorContext,
            originalMessage: exceptionResponse.message,
          },
        });
      }
    } else {
      // Handle unknown errors
      errorResponse = {
        errorCode: ErrorCode.INTERNAL_ERROR,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: await this.i18n.translate('errors.INTERNAL_ERROR', { lang }),
        timestamp: new Date().toISOString(),
        path: request.url,
        correlationId,
      };

      // Log unknown errors with full context
      const fatalErrorContext = {
        ...errorContext,
        errorCode: ErrorCode.INTERNAL_ERROR,
        errorType: exception instanceof Error ? exception.constructor.name : 'Unknown',
        errorCategory: this.categorizeError(ErrorCode.INTERNAL_ERROR),
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        stack: exception instanceof Error ? exception.stack : undefined,
        originalError:
          exception instanceof Error
            ? {
                name: exception.name,
                message: exception.message,
              }
            : { raw: String(exception) },
      };

      this.loggerService.fatal('Unhandled Exception', fatalErrorContext);

      // Send to Sentry
      if (exception instanceof Error) {
        this.sentryService.captureError(exception, fatalErrorContext);
      }

      // Send critical alert
      await this.alertingService.sendCriticalErrorAlert(
        exception instanceof Error ? exception : new Error(String(exception)),
        {
          ...fatalErrorContext,
          environment: process.env.NODE_ENV || 'development',
          service: 'strellerminds-backend',
        },
      );

      // Also log with the original logger for backward compatibility
      this.logger.error(
        `Unhandled error: ${exception instanceof Error ? exception.message : 'Unknown error'}`,
        exception instanceof Error ? exception.stack : undefined,
      );

      // Add to error dashboard
      await this.errorDashboardService.addErrorLog({
        correlationId,
        errorCode: ErrorCode.INTERNAL_ERROR,
        message: await this.i18n.translate('errors.INTERNAL_ERROR', { lang }),
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
        endpoint: request.url,
        method: request.method,
        userId: user?.id,
        userAgent: request.get('User-Agent'),
        ip: request.ip,
        severity: this.getSeverityForErrorCode(ErrorCode.INTERNAL_ERROR),
        category: this.categorizeError(ErrorCode.INTERNAL_ERROR),
        stackTrace: exception instanceof Error ? exception.stack : undefined,
        context: fatalErrorContext,
      });
    }

    // Add stack trace in development environment
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    // Set correlation ID in response headers
    response.setHeader('X-Correlation-ID', correlationId);

    // Log response for monitoring
    this.loggerService.logResponse('Error Response Sent', {
      correlationId,
      statusCode: errorResponse.statusCode,
      errorCode: errorResponse.errorCode,
      method: request.method,
      url: request.url,
    });

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private formatValidationErrors(
    validationErrors: ValidationError[],
  ): Array<{ field: string; message: string }> {
    return validationErrors.map((error) => ({
      field: error.property,
      message: Object.values(error.constraints || {}).join(', '),
    }));
  }

  /**
   * Categorize errors for better tracking and reporting
   * @param errorCode The error code to categorize
   * @returns The category of the error
   */
  private categorizeError(errorCode: ErrorCode): string {
    switch (errorCode) {
      case ErrorCode.UNAUTHORIZED:
      case ErrorCode.INVALID_CREDENTIALS:
      case ErrorCode.TOKEN_EXPIRED:
      case ErrorCode.FORBIDDEN:
        return 'AUTHENTICATION';

      case ErrorCode.NOT_FOUND:
      case ErrorCode.ALREADY_EXISTS:
      case ErrorCode.CONFLICT:
        return 'RESOURCE';

      case ErrorCode.INVALID_INPUT:
      case ErrorCode.MISSING_REQUIRED_FIELD:
      case ErrorCode.INVALID_FORMAT:
        return 'VALIDATION';

      case ErrorCode.INSUFFICIENT_FUNDS:
      case ErrorCode.PAYMENT_FAILED:
      case ErrorCode.COURSE_NOT_AVAILABLE:
      case ErrorCode.ENROLLMENT_CLOSED:
        return 'BUSINESS_LOGIC';

      case ErrorCode.INTERNAL_ERROR:
      case ErrorCode.SERVICE_UNAVAILABLE:
      case ErrorCode.DATABASE_ERROR:
      case ErrorCode.EXTERNAL_SERVICE_ERROR:
        return 'SYSTEM';

      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Get severity level for error code
   * @param errorCode The error code
   * @returns The severity level
   */
  private getSeverityForErrorCode(errorCode: ErrorCode): 'low' | 'medium' | 'high' | 'critical' {
    switch (errorCode) {
      case ErrorCode.UNAUTHORIZED:
      case ErrorCode.INVALID_CREDENTIALS:
      case ErrorCode.TOKEN_EXPIRED:
      case ErrorCode.FORBIDDEN:
      case ErrorCode.NOT_FOUND:
        return 'low';

      case ErrorCode.INVALID_INPUT:
      case ErrorCode.MISSING_REQUIRED_FIELD:
      case ErrorCode.INVALID_FORMAT:
      case ErrorCode.ALREADY_EXISTS:
      case ErrorCode.CONFLICT:
        return 'medium';

      case ErrorCode.INSUFFICIENT_FUNDS:
      case ErrorCode.PAYMENT_FAILED:
      case ErrorCode.COURSE_NOT_AVAILABLE:
      case ErrorCode.ENROLLMENT_CLOSED:
        return 'high';

      case ErrorCode.INTERNAL_ERROR:
      case ErrorCode.SERVICE_UNAVAILABLE:
      case ErrorCode.DATABASE_ERROR:
      case ErrorCode.EXTERNAL_SERVICE_ERROR:
        return 'critical';

      default:
        return 'medium';
    }
  }
}
