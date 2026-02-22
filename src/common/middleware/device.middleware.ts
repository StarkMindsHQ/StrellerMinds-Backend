import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class DeviceMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const userAgent = req.headers['user-agent'] || '';

    req.isMobile = /mobile|android|iphone/i.test(userAgent);
    req.appVersion = req.headers['x-app-version'] || null;

    next();
  }
}