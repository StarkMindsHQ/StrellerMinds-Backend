import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from '../logging/logger.service';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly loggerService: LoggerService) {
    this.loggerService.setContext('CorrelationIdMiddleware');
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // Generate or extract correlation ID
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
    
    // Set correlation ID in request headers
    req.headers['x-correlation-id'] = correlationId;
    
    // Set correlation ID in response headers
    res.setHeader('X-Correlation-ID', correlationId);
    
    // Add correlation ID to request object for easy access
    (req as any).correlationId = correlationId;
    
    // Log request with correlation ID
    this.loggerService.logRequest('Incoming Request', {
      correlationId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    });
    
    next();
  }
}
