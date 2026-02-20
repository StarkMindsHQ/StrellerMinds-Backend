import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import * as crypto from 'crypto';

@Injectable()
export class TokenBlacklistMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip blacklist check if there is no Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }

    try {
      const [scheme, token] = authHeader.split(' ');
      if (scheme !== 'Bearer' || !token) {
        return next();
      }

      // Tokens are stored as a SHA-256 hash in the database for security.
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Check if the corresponding stored refresh token has been revoked.
      const blacklistedToken = await this.refreshTokenRepository.findOne({
        where: {
          token: tokenHash,
          isRevoked: true,
        },
      });

      if (blacklistedToken) {
        throw new HttpException('Token has been revoked', HttpStatus.UNAUTHORIZED);
      }

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Token validation failed');
    }
  }
}

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // CORS headers (if not handled by CORS middleware)
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');

    next();
  }
}
