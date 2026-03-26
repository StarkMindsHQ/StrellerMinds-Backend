import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import {
  ErrorCode,
  ErrorSeverity,
  ErrorCategory,
  ErrorDetail,
  StandardizedErrorResponse,
  ERROR_STATUS_MAP,
  ERROR_SEVERITY_MAP,
  ERROR_CATEGORY_MAP,
} from '../errors/error-types';
import { ErrorLocalizationService } from '../services/error-localization.service';
import { StandardizedException } from '../exceptions/standardized-exceptions';

/** Shape of HttpException.getResponse() when it returns an object */
interface HttpExceptionResponseObject {
  message?: string | string[];
  error?: string;
  details?: unknown;
  errorCode?: ErrorCode;
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  errors?: ErrorDetail[];
  detail?: string;
  documentationUrl?: string;
  debug?: Record<string, unknown>;
}

/**
 * Global exception filter that standardizes all error responses
 * Provides consistent error format with localization, tracking, and documentation
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    @Optional()
    @Inject(ErrorLocalizationService)
    private readonly errorLocalization?: ErrorLocalizationService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const language = (request as any).language || 'en';
    const errorResponse = this.buildErrorResponse(exception, request, language);

    this.logError(exception, request, errorResponse);
    this.trackError(exception, request, errorResponse);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  /**
   * Build a standardized error response
   */
  private buildErrorResponse(
    exception: unknown,
    request: Request,
    language: string,
  ): StandardizedErrorResponse {
    const requestId = this.getRequestId(request);
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    // Handle StandardizedException (our custom exceptions)
    if (exception instanceof StandardizedException) {
      return this.handleStandardizedException(exception, request, {
        requestId,
        timestamp,
        path,
        method,
        language,
      });
    }

    // Handle HttpException (NestJS built-in)
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, request, {
        requestId,
        timestamp,
        path,
        method,
        language,
      });
    }

    // Handle generic Error
    if (exception instanceof Error) {
      return this.handleGenericError(exception, request, {
        requestId,
        timestamp,
        path,
        method,
        language,
      });
    }

    // Unknown exception type
    return this.handleUnknownException(exception, {
      requestId,
      timestamp,
      path,
      method,
      language,
    });
  }

  /**
   * Handle StandardizedException
   */
  private handleStandardizedException(
    exception: StandardizedException,
    request: Request,
    context: {
      requestId: string;
      timestamp: string;
      path: string;
      method: string;
      language: string;
    },
  ): StandardizedErrorResponse {
    const { requestId, timestamp, path, method, language } = context;
    const statusCode = exception.getStatus();
    const response = exception.getResponse() as HttpExceptionResponseObject;

    // Get localized message
    const message = this.getLocalizedMessage(exception.errorCode, language, exception.message);

    // Get technical detail
    const detail = exception.detail || response?.detail;

    const errorResponse: StandardizedErrorResponse = {
      success: false,
      errorCode: exception.errorCode,
      message,
      detail,
      statusCode,
      severity: exception.severity,
      category: exception.category,
      errors: exception.errors,
      requestId,
      timestamp,
      path,
      method,
      documentationUrl: exception.documentationUrl || this.getDocumentationUrl(exception.errorCode),
    };

    // Add debug info in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = exception.stack;
      errorResponse.debug = exception.debug;
    }

    return errorResponse;
  }

  /**
   * Handle HttpException
   */
  private handleHttpException(
    exception: HttpException,
    request: Request,
    context: {
      requestId: string;
      timestamp: string;
      path: string;
      method: string;
      language: string;
    },
  ): StandardizedErrorResponse {
    const { requestId, timestamp, path, method, language } = context;
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string;
    let errorCode = this.mapHttpStatusToErrorCode(statusCode);
    let detail: string | undefined;
    let errors: ErrorDetail[] | undefined;
    let severity = ERROR_SEVERITY_MAP[errorCode] || ErrorSeverity.MEDIUM;
    let category = ERROR_CATEGORY_MAP[errorCode] || ErrorCategory.BUSINESS_LOGIC;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const body = exceptionResponse as HttpExceptionResponseObject;
      
      // Extract message
      if (Array.isArray(body.message)) {
        message = body.message[0];
        errors = body.message.map((msg, index) => ({
          code: `${errorCode}_FIELD_${index}`,
          message: msg,
        }));
      } else {
        message = body.message || exception.message;
      }

      // Use provided errorCode if available
      if (body.errorCode && this.isValidErrorCode(body.errorCode)) {
        errorCode = body.errorCode;
      }

      // Use provided severity/category if available
      if (body.severity) severity = body.severity;
      if (body.category) category = body.category;
      if (body.errors) errors = body.errors;
      if (body.detail) detail = body.detail;

      // Handle class-validator errors
      if (body.details && Array.isArray(body.details)) {
        errors = this.formatValidationErrors(body.details);
        errorCode = ErrorCode.VALIDATION_ERROR;
        category = ErrorCategory.VALIDATION;
        severity = ErrorSeverity.LOW;
      }
    } else {
      message = exception.message;
    }

    // Get localized message
    message = this.getLocalizedMessage(errorCode, language, message);

    const errorResponse: StandardizedErrorResponse = {
      success: false,
      errorCode,
      message,
      detail,
      statusCode,
      severity,
      category,
      errors,
      requestId,
      timestamp,
      path,
      method,
      documentationUrl: this.getDocumentationUrl(errorCode),
    };

    // Add debug info in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = exception.stack;
    }

    return errorResponse;
  }

  /**
   * Handle generic Error
   */
  private handleGenericError(
    exception: Error,
    request: Request,
    context: {
      requestId: string;
      timestamp: string;
      path: string;
      method: string;
      language: string;
    },
  ): StandardizedErrorResponse {
    const { requestId, timestamp, path, method, language } = context;
    const errorCode = ErrorCode.INTERNAL_SERVER_ERROR;

    const message = this.getLocalizedMessage(
      errorCode,
      language,
      'An unexpected error occurred. Our team has been notified.',
    );

    const errorResponse: StandardizedErrorResponse = {
      success: false,
      errorCode,
      message,
      detail: process.env.NODE_ENV === 'development' ? exception.message : undefined,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.SYSTEM,
      requestId,
      timestamp,
      path,
      method,
      documentationUrl: this.getDocumentationUrl(errorCode),
    };

    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = exception.stack;
      errorResponse.debug = {
        name: exception.name,
        message: exception.message,
      };
    }

    return errorResponse;
  }

  /**
   * Handle unknown exception type
   */
  private handleUnknownException(
    exception: unknown,
    context: {
      requestId: string;
      timestamp: string;
      path: string;
      method: string;
      language: string;
    },
  ): StandardizedErrorResponse {
    const { requestId, timestamp, path, method, language } = context;
    const errorCode = ErrorCode.UNKNOWN_ERROR;

    const message = this.getLocalizedMessage(
      errorCode,
      language,
      'An unexpected error occurred.',
    );

    return {
      success: false,
      errorCode,
      message,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      severity: ErrorSeverity.CRITICAL,
      category: ErrorCategory.SYSTEM,
      requestId,
      timestamp,
      path,
      method,
      documentationUrl: this.getDocumentationUrl(errorCode),
    };
  }

  /**
   * Get localized error message
   */
  private getLocalizedMessage(
    errorCode: ErrorCode,
    language: string,
    defaultMessage: string,
  ): string {
    if (this.errorLocalization) {
      return this.errorLocalization.getLocalizedMessage(errorCode, language);
    }
    return defaultMessage;
  }

  /**
   * Get documentation URL for an error code
   */
  private getDocumentationUrl(errorCode: ErrorCode): string {
    if (this.errorLocalization) {
      return this.errorLocalization.getDocumentationUrl(errorCode);
    }
    return `https://docs.strellerminds.com/errors/${errorCode}`;
  }

  /**
   * Map HTTP status code to error code
   */
  private mapHttpStatusToErrorCode(status: number): ErrorCode {
    const mapping: Record<number, ErrorCode> = {
      [HttpStatus.BAD_REQUEST]: ErrorCode.INVALID_INPUT,
      [HttpStatus.UNAUTHORIZED]: ErrorCode.AUTH_UNAUTHORIZED,
      [HttpStatus.FORBIDDEN]: ErrorCode.AUTH_FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ErrorCode.RESOURCE_NOT_FOUND,
      [HttpStatus.CONFLICT]: ErrorCode.RESOURCE_CONFLICT,
      [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.VALIDATION_ERROR,
      [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMIT_EXCEEDED,
      [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.INTERNAL_SERVER_ERROR,
      [HttpStatus.BAD_GATEWAY]: ErrorCode.INTEGRATION_ERROR,
      [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
      [HttpStatus.GATEWAY_TIMEOUT]: ErrorCode.INTEGRATION_TIMEOUT,
      [HttpStatus.PAYMENT_REQUIRED]: ErrorCode.PAYMENT_FAILED,
      [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.FILE_TOO_LARGE,
      [HttpStatus.LOCKED]: ErrorCode.RESOURCE_LOCKED,
    };

    return mapping[status] || ErrorCode.UNKNOWN_ERROR;
  }

  /**
   * Format class-validator errors into ErrorDetail array
   */
  private formatValidationErrors(errors: any[]): ErrorDetail[] {
    return errors.map((error) => ({
      field: error.property,
      code: error.constraints ? Object.keys(error.constraints)[0].toUpperCase() : 'INVALID',
      message: error.constraints ? String(Object.values(error.constraints)[0]) : 'Invalid value',
      value: error.value,
    }));
  }

  /**
   * Get request ID from headers or generate one
   */
  private getRequestId(request: Request): string {
    return (
      (request.headers['x-request-id'] as string) ||
      (request.headers['x-correlation-id'] as string) ||
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    );
  }

  /**
   * Check if string is a valid error code
   */
  private isValidErrorCode(code: string): code is ErrorCode {
    return Object.values(ErrorCode).includes(code as ErrorCode);
  }

  /**
   * Log error with appropriate level
   */
  private logError(
    exception: unknown,
    request: Request,
    errorResponse: StandardizedErrorResponse,
  ): void {
    const { statusCode, message, errorCode, severity, category } = errorResponse;
    const { method, url, ip, headers } = request;

    const logContext = {
      statusCode,
      errorCode,
      severity,
      category,
      method,
      url,
      ip,
      userAgent: headers['user-agent'],
      requestId: errorResponse.requestId,
    };

    const logMessage = `${method} ${url} - ${statusCode} - [${errorCode}] ${message}`;

    if (statusCode >= 500 || severity === ErrorSeverity.CRITICAL) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : 'No stack trace',
        JSON.stringify(logContext),
      );
    } else if (statusCode >= 400 || severity === ErrorSeverity.HIGH) {
      this.logger.warn(logMessage, JSON.stringify(logContext));
    } else {
      this.logger.log(logMessage, JSON.stringify(logContext));
    }
  }

  /**
   * Track error in monitoring systems (Sentry, etc.)
   */
  private trackError(
    exception: unknown,
    request: Request,
    errorResponse: StandardizedErrorResponse,
  ): void {
    const { statusCode, errorCode, severity, category } = errorResponse;

    // Only track errors with severity HIGH or CRITICAL, or 5xx errors
    const shouldTrack =
      statusCode >= 500 ||
      severity === ErrorSeverity.CRITICAL ||
      severity === ErrorSeverity.HIGH;

    if (!shouldTrack) {
      return;
    }

    // Send to Sentry if configured
    const sentryDsn = process.env.SENTRY_DSN;
    if (sentryDsn && !sentryDsn.includes('your-sentry-dsn')) {
      Sentry.withScope((scope) => {
        scope.setTag('errorCode', errorCode);
        scope.setTag('errorCategory', category);
        scope.setTag('errorSeverity', severity);
        scope.setTag('httpMethod', request.method);
        scope.setTag('httpPath', request.path);
        scope.setExtra('requestId', errorResponse.requestId);
        scope.setExtra('statusCode', statusCode);

        if (exception instanceof Error) {
          Sentry.captureException(exception);
        } else {
          Sentry.captureMessage(`Non-Error exception: ${errorCode}`, severity === ErrorSeverity.CRITICAL ? 'fatal' : 'error');
        }
      });
    }

    // Log for monitoring integration
    if (process.env.NODE_ENV === 'production') {
      this.logger.error(
        `[ERROR_TRACKING] ${errorCode} - ${statusCode} - ${severity}`,
        JSON.stringify({
          errorCode,
          category,
          severity,
          statusCode,
          requestId: errorResponse.requestId,
          path: request.path,
          method: request.method,
        }),
      );
    }
  }
}
