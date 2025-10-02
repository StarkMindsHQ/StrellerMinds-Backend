import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class OfflineMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Add offline-friendly headers
    res.setHeader('X-Offline-Support', 'true');

    // Add service worker headers for PWA support
    if (req.url.includes('sw.js') || req.url.includes('service-worker')) {
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache');
    }

    // Add manifest headers
    if (req.url.includes('manifest.json')) {
      res.setHeader('Content-Type', 'application/manifest+json');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }

    // Detect offline requests (from service worker)
    if (req.headers['x-offline-request']) {
      req['isOfflineRequest'] = true;
    }

    next();
  }
}
