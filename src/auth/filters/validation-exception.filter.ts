import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

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
