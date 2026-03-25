import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiAnalyticsMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ApiAnalyticsMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    this.logger.log(`[API] ${req.method} ${req.originalUrl}`);
    // Push metrics to analytics service like Prometheus or DataDog
    next();
  }
}
