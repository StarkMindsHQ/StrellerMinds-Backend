import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException } from '../../shared/domain/exceptions/domain-exceptions';
import { SecureLoggerService } from '../secure-logging/secure-logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');
  private readonly secureLogger: SecureLoggerService;

  constructor() {
    this.secureLogger = new SecureLoggerService();
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request['requestId'];

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';
    let error = 'InternalServerError';
    let errors: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      message = res.message || exception.message;
      error = res.error || exception.name;

      // Handle validation errors from ValidationPipe
      if (status === HttpStatus.BAD_REQUEST && Array.isArray(res.message)) {
        errors = this.formatValidationErrors(res.message);
        message = 'Validation failed';
      }

      // Handle rate limit errors (429 Too Many Requests)
      if (status === HttpStatus.TOO_MANY_REQUESTS || res?.statusCode === 429) {
        status = HttpStatus.TOO_MANY_REQUESTS;
        message = 'Too many requests. Please try again later.';
        error = 'TooManyRequests';
        const resetTime = res?.resetTime;
        const retryAfter = res?.retryAfter;
        errors = {
          retryAfter:
            retryAfter || (resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : undefined),
          resetTime: resetTime || new Date().toISOString(),
        };
      }
    } else if (exception instanceof DomainException) {
      status = this.mapDomainExceptionToStatus(exception);
      message = exception.message;
      error = exception.getCode();

      // Handle detailed reasons for some exceptions
      if ((exception as any).getReasons) {
        errors = (exception as any).getReasons();
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;

      // Special handling for TypeORM/Database errors
      if (exception.name === 'QueryFailedError') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Database query failed';
        error = 'DatabaseError';
      }
    }

    // Log the error securely
    this.secureLogger.error(`${request.method} ${request.url} failed`, {
      status,
      error,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      path: request.url,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(errors ? { errors } : {}),
    });
  }

  private formatValidationErrors(validationErrors: any[]): Record<string, string[]> {
    if (!Array.isArray(validationErrors)) return { general: [validationErrors] };

    return validationErrors.reduce(
      (acc, error) => {
        if (typeof error === 'string') {
          acc['general'] = acc['general'] || [];
          acc['general'].push(error);
        } else if (typeof error === 'object' && error.property && error.constraints) {
          acc[error.property] = Object.values(error.constraints);
        } else {
          acc['general'] = acc['general'] || [];
          acc['general'].push(JSON.stringify(error));
        }
        return acc;
      },
      {} as Record<string, string[]>,
    );
  }

  private mapDomainExceptionToStatus(exception: DomainException): number {
    const code = exception.getCode();

    switch (code) {
      case 'ENTITY_NOT_FOUND':
      case 'USER_NOT_FOUND':
        return HttpStatus.NOT_FOUND;
      case 'USER_ALREADY_EXISTS':
      case 'CONSTRAINT_VIOLATION':
        return HttpStatus.CONFLICT;
      case 'INVALID_CREDENTIALS':
      case 'EMAIL_VERIFICATION_FAILED':
        return HttpStatus.UNAUTHORIZED;
      case 'INVALID_OPERATION':
      case 'PASSWORD_STRENGTH_FAILED':
        return HttpStatus.BAD_REQUEST;
      default:
        return HttpStatus.BAD_REQUEST;
    }
  }
}
