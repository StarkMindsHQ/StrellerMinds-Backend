import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { hasForbiddenKeys } from '../security/sanitize.util';

@Injectable()
export class InputSecurityMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    // Early rejection for prototype-pollution style payloads
    if (hasForbiddenKeys(req.body) || hasForbiddenKeys(req.query) || hasForbiddenKeys(req.params)) {
      throw new BadRequestException('Request contains forbidden keys');
    }
    next();
  }
}
