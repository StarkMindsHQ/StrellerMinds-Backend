import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from '../interfaces/error-response.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    this.logError(exception, request, errorResponse);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: Request): ErrorResponse {
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        error = (exceptionResponse as any).error || exception.name;
        details = (exceptionResponse as any).details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    return {
      statusCode,
      message: this.getUserFriendlyMessage(statusCode, message),
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.headers['x-request-id'] as string,
      ...(process.env.NODE_ENV === 'development' && details ? { details } : {}),
    };
  }

  private getUserFriendlyMessage(statusCode: number, originalMessage: string): string {
    const friendlyMessages: Record<number, string> = {
      400: 'The request could not be processed. Please check your input.',
      401: 'You need to be authenticated to access this resource.',
      403: 'You do not have permission to access this resource.',
      404: 'The requested resource was not found.',
      409: 'This request conflicts with the current state of the resource.',
      422: 'The provided data failed validation.',
      429: 'Too many requests. Please try again later.',
      500: 'An unexpected error occurred. Our team has been notified.',
      502: 'Service temporarily unavailable. Please try again.',
      503: 'Service is currently under maintenance.',
    };

    // Return user-friendly message for common status codes in production
    if (process.env.NODE_ENV === 'production' && friendlyMessages[statusCode]) {
      return friendlyMessages[statusCode];
    }

    return originalMessage;
  }

  private logError(exception: unknown, request: Request, errorResponse: ErrorResponse) {
    const { statusCode, message, error } = errorResponse;
    const { method, url, ip, headers } = request;

    const logContext = {
      statusCode,
      message,
      error,
      method,
      url,
      ip,
      userAgent: headers['user-agent'],
      requestId: headers['x-request-id'],
    };

    if (statusCode >= 500) {
      this.logger.error(
        `${method} ${url} - ${statusCode} - ${message}`,
        exception instanceof Error ? exception.stack : 'No stack trace',
        JSON.stringify(logContext),
      );

      // Send to monitoring service (e.g., Sentry, DataDog)
      this.sendToMonitoring(exception, logContext);
    } else if (statusCode >= 400) {
      this.logger.warn(`${method} ${url} - ${statusCode} - ${message}`, JSON.stringify(logContext));
    }
  }

  private sendToMonitoring(exception: unknown, context: any) {
    // Integrate with your monitoring service
    // Example: Sentry
    // Sentry.captureException(exception, { contexts: { custom: context } });

    // Example: Custom alerting
    if (process.env.NODE_ENV === 'production') {
      // Send alert to Slack, PagerDuty, etc.
      console.error('[MONITORING]', { exception, context });
    }
  }
}
