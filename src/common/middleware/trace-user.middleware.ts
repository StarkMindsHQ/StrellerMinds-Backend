import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { trace } from '@opentelemetry/api';

@Injectable()
export class TraceUserMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const span = trace.getSpan(trace.context.active());
    if (span && (req as any).user?.id) {
      span.setAttribute('enduser.id', (req as any).user.id);
    }
    next();
  }
}
