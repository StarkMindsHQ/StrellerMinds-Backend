import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class NotificationLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(NotificationLoggingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, body } = req;

    this.logger.log(`${method} ${originalUrl} - Notification request started`);

    if (body && Object.keys(body).length > 0) {
      const sanitizedBody = { ...body };
      if (sanitizedBody.deviceTokens) {
        sanitizedBody.deviceTokens = `[${sanitizedBody.deviceTokens.length} tokens]`;
      }
      this.logger.debug(`Request body: ${JSON.stringify(sanitizedBody)}`);
    }

    const originalSend = res.send;
    res.send = function(body) {
      const duration = Date.now() - startTime;
      const logger = new Logger(NotificationLoggingMiddleware.name);
      logger.log(`${method} ${originalUrl} - ${res.statusCode} - ${duration}ms`);
      return originalSend.call(this, body);
    };

    next();
  }
}