import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class WebhookRawBodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Only process webhook requests
    if (this.isWebhookRequest(req)) {
      this.captureRawBody(req);
    }
    next();
  }

  /**
   * Check if request is a webhook request
   */
  private isWebhookRequest(req: Request): boolean {
    const path = req.path || req.url;
    return !!(
      path.includes('/webhooks/') ||
      path.includes('/webhook') ||
      req.headers['x-webhook-provider'] ||
      req.headers['stripe-signature'] ||
      req.headers['x-zm-signature'] ||
      req.headers['paypal-auth-algo']
    );
  }

  /**
   * Capture raw body for signature verification
   */
  private captureRawBody(req: Request): void {
    if ((req as any).rawBody) {
      return; // Already captured
    }

    const originalJson = (req as any).json;
    const originalText = (req as any).text;

    let rawData = '';

    req.on('data', (chunk) => {
      rawData += chunk;
    });

    req.on('end', () => {
      (req as any).rawBody = rawData;

      // Restore original methods with captured data
      (req as any).json = () => {
        try {
          return JSON.parse(rawData);
        } catch (error) {
          return originalJson ? originalJson.call(req) : {};
        }
      };

      (req as any).text = () => rawData;
    });
  }
}
