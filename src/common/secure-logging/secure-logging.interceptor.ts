import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { SecureLoggerService } from './secure-logger.service';

/**
 * Logging Interceptor that sanitizes sensitive data from HTTP request/response logs
 *
 * This interceptor logs HTTP requests and responses while ensuring that
 * sensitive data like passwords, tokens, and PII are never logged.
 */
@Injectable()
export class SecureLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SecureLoggingInterceptor.name);
  private readonly secureLogger: SecureLoggerService;

  constructor() {
    this.secureLogger = new SecureLoggerService();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method, url, headers, body, params, query } = request;

    // Log request start (with sanitized data)
    this.secureLogger.log(`Incoming Request: ${method} ${url}`, {
      method,
      url,
      params: this.sanitizeSensitiveData(params),
      query: this.sanitizeSensitiveData(query),
      // Don't log full headers to avoid logging authorization tokens
      userAgent: headers['user-agent'],
      ip: request.ip,
      timestamp: new Date().toISOString(),
    });

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;

          // Log successful response (with sanitized data)
          this.secureLogger.log(
            `Response: ${method} ${url} - ${response.statusCode} (${duration}ms)`,
            {
              method,
              url,
              statusCode: response.statusCode,
              duration: `${duration}ms`,
              // Sanitize response body to prevent leaking sensitive data
              responseBody: this.sanitizeResponse(data),
              timestamp: new Date().toISOString(),
            },
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;

          // Log error response (with sanitized data)
          this.secureLogger.error(
            `Error Response: ${method} ${url} - ${error?.status || 500} (${duration}ms)`,
            {
              method,
              url,
              statusCode: error?.status || 500,
              duration: `${duration}ms`,
              error: this.sanitizeError(error),
              timestamp: new Date().toISOString(),
            },
          );
        },
      }),
    );
  }

  /**
   * Sanitize sensitive data from request/response objects
   */
  private sanitizeSensitiveData(data: any): any {
    if (!data) {
      return data;
    }

    const sensitiveFields = [
      'password',
      'passwd',
      'pwd',
      'secret',
      'token',
      'accessToken',
      'refreshToken',
      'authorization',
      'auth',
      'creditCard',
      'cardNumber',
      'cvv',
      'ssn',
      'socialSecurity',
      'currentPassword',
      'newPassword',
      'confirmPassword',
      'oldPassword',
      'resetToken',
      'resetCode',
    ];

    if (typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();

      // Check if this field should be sanitized
      const isSensitive = sensitiveFields.some((sensitiveField) =>
        lowerKey.includes(sensitiveField.toLowerCase()),
      );

      if (isSensitive && sanitized[key]) {
        if (typeof sanitized[key] === 'string') {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = '[REDACTED]';
        }
      }
    }

    return sanitized;
  }

  /**
   * Sanitize response data
   */
  private sanitizeResponse(data: any): any {
    if (!data) {
      return data;
    }

    // Don't log full response bodies, just indicate if data exists
    if (typeof data === 'object') {
      const keys = Object.keys(data);
      return {
        hasData: keys.length > 0,
        keys: keys.slice(0, 5), // Only log first 5 keys
        // Sanitize the actual data
        sanitizedData: this.sanitizeSensitiveData(data),
      };
    }

    return data;
  }

  /**
   * Sanitize error objects to prevent leaking sensitive information
   */
  private sanitizeError(error: any): any {
    if (!error) {
      return error;
    }

    const sanitizedError: any = {
      message: error?.message || 'Unknown error',
      status: error?.status || 500,
    };

    // Only include stack trace in development
    if (process.env.NODE_ENV === 'development' && error?.stack) {
      sanitizedError.stack = error.stack;
    }

    return sanitizedError;
  }
}
