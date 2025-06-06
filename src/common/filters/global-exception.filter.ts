import {
  Catch,
  ArgumentsHost,
  HttpException, 
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nService } from '../../i18n/i18n.service';
import { ErrorCode } from '../errors/error-codes.enum';
import { ErrorResponseDto } from '../errors/error-response.dto';
import { ValidationError } from 'class-validator';
import { CustomException } from '../errors/custom.exception';
import { I18nTranslations } from '../../i18n/i18n.types';

@Catch()
export class GlobalExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionsFilter.name);

  constructor(private readonly i18n: I18nService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const lang = request.headers['accept-language']?.split(',')[0] || 'en';

    let errorResponse: ErrorResponseDto;

    if (exception instanceof CustomException) {
      const httpException = exception as HttpException;
      const exceptionResponse = httpException.getResponse() as any;
      errorResponse = {
        errorCode: exception.errorCode,
        statusCode: httpException.getStatus(),
        message: exceptionResponse.message, // Message is already translated in CustomException
        details: exceptionResponse.details,
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    } else if (exception instanceof HttpException) {
      const httpException = exception as HttpException;
      const exceptionResponse = httpException.getResponse() as any;
      
      // Handle class-validator validation errors
      if (Array.isArray(exceptionResponse.message)) {
        errorResponse = {
          errorCode: ErrorCode.INVALID_INPUT,
          statusCode: httpException.getStatus(),
          message: await (this.i18n.translate('errors.INVALID_INPUT', { lang })) as string,
          details: this.formatValidationErrors(exceptionResponse.message),
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      } else {
        errorResponse = {
          errorCode: ErrorCode.INTERNAL_ERROR,
          statusCode: httpException.getStatus(),
          message: (await this.i18n.translate(`error_messages.common.internalServerError`, { lang })) as string,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }
    } else {
      // Handle unknown errors
      errorResponse = {
        errorCode: ErrorCode.INTERNAL_ERROR,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: (await this.i18n.translate(`error_messages.common.internalServerError`, { lang })) as string,
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      // Log unknown errors for debugging
      this.logger.error(
        `Unhandled error: ${exception instanceof Error ? exception.message : 'Unknown error'}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // Add stack trace in development environment
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private formatValidationErrors(validationErrors: ValidationError[]): Array<{ field: string; message: string }> {
    return validationErrors.map(error => ({
      field: error.property,
      message: Object.values(error.constraints || {}).join(', '),
    }));
  }
}
