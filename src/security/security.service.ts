import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SECURITY_CONFIG } from './security.config';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Apply custom security headers
    this.applySecurityHeaders(res);

    // Rate limiting headers
    this.applyRateLimitHeaders(res);

    // Request validation
    this.validateRequest(req, res);

    next();
  }

  private applySecurityHeaders(res: Response) {
    const headers = SECURITY_CONFIG.securityHeaders;

    // Content Security Policy
    if (headers.contentSecurityPolicy) {
      const cspDirectives = Object.entries(headers.contentSecurityPolicy.directives)
        .map(([key, values]) => `${key} ${values.join(' ')}`)
        .join('; ');
      res.setHeader('Content-Security-Policy', cspDirectives);
    }

    // HSTS
    if (headers.hsts) {
      const hstsValue = `max-age=${headers.hsts.maxAge}${
        headers.hsts.includeSubDomains ? '; includeSubDomains' : ''
      }${headers.hsts.preload ? '; preload' : ''}`;
      res.setHeader('Strict-Transport-Security', hstsValue);
    }

    // Frame Protection
    if (headers.frameguard) {
      res.setHeader('X-Frame-Options', headers.frameguard.action.toUpperCase());
    }

    // Content Type Protection
    if (headers.noSniff) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // XSS Protection
    if (headers.xssFilter) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // Referrer Policy
    if (headers.referrerPolicy) {
      res.setHeader('Referrer-Policy', headers.referrerPolicy.policy);
    }

    // Permissions Policy
    const permissionsPolicy = [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=(self)',
      'encrypted-media=(self)',
      'fullscreen=(self)',
      'picture-in-picture=(self)',
    ].join(', ');
    res.setHeader('Permissions-Policy', permissionsPolicy);

    // Additional security headers
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Content-Security-Policy', "default-src 'self'");

    // API specific headers
    res.setHeader('X-API-Version', '1.0.0');
    res.setHeader('X-Response-Time', Date.now().toString());
  }

  private applyRateLimitHeaders(res: Response) {
    // Rate limiting information
    res.setHeader('X-RateLimit-Limit', '1000');
    res.setHeader('X-RateLimit-Remaining', '999');
    res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000 + 3600).toString());
  }

  private validateRequest(req: Request, res: Response) {
    // Validate request size
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (contentLength > maxSize) {
      res.status(413).json({
        error: 'Request Entity Too Large',
        message: `Maximum request size is ${maxSize / 1024 / 1024}MB`,
        code: 'REQUEST_TOO_LARGE',
      });
      return;
    }

    // Validate content type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.headers['content-type'];
      const allowedTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'text/plain',
      ];

      if (contentType && !allowedTypes.some((type) => contentType.includes(type))) {
        res.status(415).json({
          error: 'Unsupported Media Type',
          message: 'Content-Type not supported',
          code: 'UNSUPPORTED_MEDIA_TYPE',
        });
        return;
      }
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ];

    const body = (req as any).body;
    if (body && typeof body === 'object') {
      const bodyString = JSON.stringify(body);
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(bodyString)) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Request contains potentially malicious content',
            code: 'MALICIOUS_CONTENT',
          });
          return;
        }
      }
    }
  }
}
