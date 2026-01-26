import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly tokens = new Map<string, { token: string; expires: number }>();
  private readonly tokenExpiry = 3600000; // 1 hour

  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const csrfConfig = this.configService.get('csrf');
    
    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      this.generateCsrfToken(req, res);
      return next();
    }

    // Skip CSRF for API endpoints that don't need it
    if (this.shouldSkipCsrf(req.path)) {
      return next();
    }

    // Validate CSRF token for state-changing requests
    this.validateCsrfToken(req);
    next();
  }

  private generateCsrfToken(req: Request, res: Response) {
    const sessionId = this.getSessionId(req);
    
    // Check if existing token is still valid
    const existing = this.tokens.get(sessionId);
    if (existing && existing.expires > Date.now()) {
      res.setHeader('X-CSRF-Token', existing.token);
      return;
    }

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + this.tokenExpiry;
    
    this.tokens.set(sessionId, { token, expires });
    
    // Set token in header and cookie
    res.setHeader('X-CSRF-Token', token);
    res.cookie('X-CSRF-Token', token, {
      httpOnly: false, // Must be readable by JavaScript
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: this.tokenExpiry / 1000
    });
  }

  private validateCsrfToken(req: Request) {
    const sessionId = this.getSessionId(req);
    const stored = this.tokens.get(sessionId);

    if (!stored || stored.expires < Date.now()) {
      throw new UnauthorizedException('CSRF token expired or invalid');
    }

    // Get token from header or body
    const headerToken = req.headers['x-csrf-token'] as string;
    const bodyToken = (req.body as any)?._csrf;
    const token = headerToken || bodyToken;

    if (!token) {
      throw new UnauthorizedException('CSRF token missing');
    }

    if (token !== stored.token) {
      throw new UnauthorizedException('CSRF token invalid');
    }

    // Token is valid, optionally rotate it
    if (Math.random() < 0.1) { // 10% chance to rotate
      this.generateCsrfToken(req, {} as Response);
    }
  }

  private getSessionId(req: Request): string {
    // Try to get session ID from various sources
    return (
      (req as any).sessionID ||
      (req as any).session?.id ||
      req.headers['x-session-id'] as string ||
      req.ip ||
      'anonymous'
    );
  }

  private shouldSkipCsrf(path: string): boolean {
    const skipPaths = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/health',
      '/api/docs',
      '/api/webhooks',
      '/api/integrations',
      '/api/payments/stripe/webhook'
    ];

    return skipPaths.some(skipPath => path.startsWith(skipPath));
  }

  // Cleanup expired tokens
  cleanupExpiredTokens() {
    const now = Date.now();
    for (const [key, value] of this.tokens.entries()) {
      if (value.expires < now) {
        this.tokens.delete(key);
      }
    }
  }
}
