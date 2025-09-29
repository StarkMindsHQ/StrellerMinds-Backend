import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import xss from 'xss';

function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = xss(obj[key]);
    } else if (typeof obj[key] === 'object') {
      obj[key] = sanitizeObject(obj[key]);
    }
  }
  return obj;
}

@Injectable()
export class SanitizeMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.body) req.body = sanitizeObject(req.body);
    if (req.query) req.query = sanitizeObject(req.query);
    if (req.params) req.params = sanitizeObject(req.params);
    next();
  }
} 