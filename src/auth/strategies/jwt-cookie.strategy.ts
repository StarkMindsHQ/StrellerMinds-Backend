import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Request } from 'express';
import { JWT_COOKIE_CONFIG } from '../config/cookie.config';

/**
 * JWT strategy that extracts tokens from httpOnly cookies
 * This replaces the default bearer token extraction
 */
@Injectable()
export class JwtCookieStrategy extends PassportStrategy(Strategy, 'jwt-cookie') {
  constructor() {
    // Extract JWT from cookies instead of Authorization header
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          // Try to get from cookies first (httpOnly)
          if (req.cookies && req.cookies[JWT_COOKIE_CONFIG.name]) {
            return req.cookies[JWT_COOKIE_CONFIG.name];
          }

          // Fallback to Authorization header (for testing/mobile)
          const authHeader = req.headers.authorization;
          if (authHeader?.startsWith('Bearer ')) {
            return authHeader.substring(7);
          }

          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default-secret',
    });
  }

  async validate(payload: any) {
    // Issue #803: JWT payload minimized to sub only; email/role fetched from DB when needed
    return {
      id: payload.sub,
    };
  }
}
