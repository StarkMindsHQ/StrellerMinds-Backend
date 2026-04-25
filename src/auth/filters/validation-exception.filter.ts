import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { SecureLoggerService } from '../../common/secure-logging/secure-logger.service';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);
  private readonly secureLogger: SecureLoggerService;

  constructor() {
    this.secureLogger = new SecureLoggerService();
  }

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    // Log validation error without sensitive request data
    this.secureLogger.warn('Validation error occurred', {
      status,
      message: 'Validation failed',
    });

    const validationErrors = exceptionResponse?.message || [];

    const formattedErrors = Array.isArray(validationErrors)
      ? validationErrors.reduce(
          (acc, error) => {
            if (typeof error === 'object' && error.constraints) {
              acc[error.property] = Object.values(error.constraints);
            }
            return acc;
          },
          {} as Record<string, string[]>,
        )
      : { general: validationErrors };

    response.status(status).json({
      statusCode: status,
      message: 'Validation failed',
      errors: formattedErrors,
      timestamp: new Date().toISOString(),
    });
  }
}
