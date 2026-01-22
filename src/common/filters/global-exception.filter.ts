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

    // Generate correlation ID
    const correlationId = (request.headers['x-correlation-id'] as string) || uuidv4();

    // Context for Logging/External Services
    const user = (request as any).user;
    const errorContext: ErrorLogContext = {
      correlationId,
      userId: user?.id,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.get('user-agent'),
      timestamp: new Date().toISOString(),
    };

    let statusCode: number;
    let errorCode: ErrorCode;
    let message: string;
    let details: any = null;

    // 1. CATEGORIZE AND EXTRACT ERROR DATA
    if (exception instanceof CustomException) {
      const exceptionResponse = exception.getResponse() as any;
      statusCode = exception.getStatus();
      errorCode = exceptionResponse.errorCode;
      message = await this.i18n.translate(`errors.${errorCode}`, {
        lang,
        args: exceptionResponse.args,
      });
      details = exceptionResponse.details;
    } 
    else if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse() as any;
      statusCode = exception.getStatus();
      
      if (Array.isArray(exceptionResponse.message)) {
        // Handle Class-Validator errors
        errorCode = ErrorCode.INVALID_INPUT;
        message = await this.i18n.translate('errors.INVALID_INPUT', { lang });
        details = this.formatValidationErrors(exceptionResponse.message);
      } else {
        errorCode = ErrorCode.INTERNAL_ERROR;
        message = exceptionResponse.message || await this.i18n.translate('errors.INTERNAL_ERROR', { lang });
      }
    } 
    else {
      // Unhandled/Unknown Errors
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = ErrorCode.INTERNAL_ERROR;
      message = await this.i18n.translate('errors.INTERNAL_ERROR', { lang });
    }

    // 2. CONSTRUCT STANDARDIZED RESPONSE (ISSUE #471 REQUIREMENT)
    // This top-level structure MUST match your TransformInterceptor
    const standardizedResponse = {
      success: false,
      statusCode,
      message,
      data: null, // Data is always null on error
      error: {
        errorCode,
        details,
        path: request.url,
        correlationId,
      },
      timestamp: new Date().toISOString(),
    };

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      (standardizedResponse as any).stack = exception.stack;
    }

    // 3. EXTERNAL SERVICES & LOGGING
    await this.processExternalReporting(exception, statusCode, errorCode, message, errorContext, details);

    // 4. FINAL OUTPUT
    response.setHeader('X-Correlation-ID', correlationId);
    response.status(statusCode).json(standardizedResponse);
  }

  /**
   * Helper to handle all logging, sentry, and dashboard logic
   */
  private async processExternalReporting(
    exception: any, 
    status: number, 
    errorCode: ErrorCode, 
    message: string, 
    context: ErrorLogContext,
    details: any
  ) {
    // Log to internal logger
    if (status >= 500) {
      this.loggerService.error(`Unhandled Exception: ${message}`, { ...context, errorCode });
      
      // Send to Sentry
      if (exception instanceof Error) {
        this.sentryService.captureError(exception, context);
      }

      // Send Alerts
      await this.alertingService.sendCriticalErrorAlert(
        exception instanceof Error ? exception : new Error(message),
        { ...context, severity: 'critical' }
      );
    } else {
      this.loggerService.warn(`Client Error: ${message}`, { ...context, errorCode });
    }

    // Add to Error Dashboard
    await this.errorDashboardService.addErrorLog({
      correlationId: context.correlationId,
      errorCode,
      message,
      statusCode: status,
      timestamp: new Date().toISOString(),
      endpoint: context.url,
      method: context.method,
      userId: context.userId,
      userAgent: context.userAgent,
      ip: context.ip,
      severity: this.getSeverityForErrorCode(errorCode),
      category: this.categorizeError(errorCode),
      context: { ...context, details }
    });
  }

  private formatValidationErrors(validationErrors: any[]): Array<{ field: string; message: string }> {
    if (typeof validationErrors[0] === 'string') return validationErrors; 
    return validationErrors.map(error => ({
      field: error.property,
      message: Object.values(error.constraints || {}).join(', '),
    }));
  }

  private categorizeError(errorCode: ErrorCode): string {
    const authErrors = [ErrorCode.UNAUTHORIZED, ErrorCode.FORBIDDEN, ErrorCode.TOKEN_EXPIRED];
    if (authErrors.includes(errorCode)) return 'AUTHENTICATION';
    return 'SYSTEM'; 
    // ... add more as per your enum
  }

  private getSeverityForErrorCode(errorCode: ErrorCode): 'low' | 'medium' | 'high' | 'critical' {
    if (errorCode === ErrorCode.INTERNAL_ERROR) return 'critical';
    return 'medium';
  }
}