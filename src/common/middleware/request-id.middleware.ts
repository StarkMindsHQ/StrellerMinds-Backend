import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Check if X-Request-Id header already exists (e.g. from a load balancer)
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    // Attach to request for use in controllers/services
    req['requestId'] = requestId;

    // Attach to response headers
    res.setHeader('X-Request-Id', requestId);

    next();
  }
}
