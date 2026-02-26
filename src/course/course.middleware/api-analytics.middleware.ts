import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiAnalyticsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`[API] ${req.method} ${req.originalUrl}`);
    // Push metrics to analytics service like Prometheus or DataDog
    next();
  }
}