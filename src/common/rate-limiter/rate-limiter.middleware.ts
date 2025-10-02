import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
});

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    limiter(req, res, next);
  }
}
