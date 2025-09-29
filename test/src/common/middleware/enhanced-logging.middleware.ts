import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService, LogContext } from '../logging/logger.service';

@Injectable()
export class EnhancedLoggingMiddleware implements NestMiddleware {
  constructor(private readonly loggerService: LoggerService) {
    this.loggerService.setContext('EnhancedLoggingMiddleware');
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const correlationId = (req as any).correlationId || req.headers['x-correlation-id'];
    
    // Extract user context if available
    const user = (req as any).user;
    const userContext = user ? {
      userId: user.id,
      userEmail: user.email,
    } : {};

    // Build base context
    const baseContext: LogContext = {
      correlationId,
      ...userContext,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.headers['x-request-id'] as string,
    };

    // Log request start
    this.loggerService.logRequest('Request Started', {
      ...baseContext,
      headers: this.sanitizeHeaders(req.headers),
      query: req.query,
      params: req.params,
    });

    // Override res.end to capture response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any, cb?: any) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Log response
      const responseContext: LogContext = {
        ...baseContext,
        duration,
        statusCode,
        success: statusCode < 400,
      };

      if (statusCode >= 400) {
        this.loggerService.warn('Request Failed', responseContext);
      } else {
        this.loggerService.logResponse('Request Completed', responseContext);
      }

      // Log performance if slow
      if (duration > 1000) {
        this.loggerService.logPerformance('Slow Request Detected', {
          ...responseContext,
          duration,
        });
      }

      // Call original end method
      return originalEnd.call(this, chunk, encoding, cb);
    }.bind(this);

    next();
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '***';
      }
    });

    return sanitized;
  }
}
