import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { SecureLoggerService } from '../../common/secure-logging/secure-logger.service';

/**
 * Exception filter for rate limit errors (429 Too Many Requests)
 */
@Catch(BadRequestException)
export class RateLimitExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RateLimitExceptionFilter.name);
  private readonly secureLogger: SecureLoggerService;

  constructor() {
    this.secureLogger = new SecureLoggerService();
  }

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const exceptionResponse = exception.getResponse() as any;

    // Check if this is a rate limit error
    if (
      exceptionResponse?.statusCode === 429 ||
      exceptionResponse?.message?.includes('Too many requests')
    ) {
      const resetTime = exceptionResponse?.resetTime;
      const retryAfter = exceptionResponse?.retryAfter;

      // Log rate limit violation without sensitive data
      this.secureLogger.warn('Rate limit exceeded', {
        statusCode: 429,
        retryAfter: retryAfter || Math.ceil((resetTime - Date.now()) / 1000),
      });

      return response.status(429).json({
        statusCode: 429,
        message: 'Too many requests. Please try again later.',
        error: 'Too Many Requests',
        retryAfter: retryAfter || Math.ceil((resetTime - Date.now()) / 1000),
        resetTime: resetTime || new Date().toISOString(),
        timestamp: new Date().toISOString(),
      });
    }

    // Pass through other BadRequestException errors
    response.status(exception.getStatus()).json(exceptionResponse);
  }
}
