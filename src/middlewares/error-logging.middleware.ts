import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLogger } from '../logging/logger.service';

@Injectable()
export class ErrorLoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext('ErrorLoggingMiddleware');
  }

  use(req: Request, res: Response, next: NextFunction) {
    res.on('finish', () => {
      if (res.statusCode >= 400) {
        this.logger.error(
          `HTTP Error: ${req.method} ${req.originalUrl} - Status: ${res.statusCode}`,
          undefined,
          { method: req.method, url: req.originalUrl, status: res.statusCode },
        );
      }
    });
    next();
  }
}
