import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RateLimiterPostgres } from 'rate-limiter-flexible';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface RateLimitConfig {
  points: number;
  duration: number;
  keyPrefix?: string;
}

export const RATE_LIMIT_KEY = 'rate_limit';
export const RateLimit = (config: RateLimitConfig) => SetMetadata(RATE_LIMIT_KEY, config);

@Injectable()
export class EnhancedRateLimitGuard implements CanActivate {
  private rateLimiters = new Map<string, RateLimiterPostgres>();

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    
    // Get rate limit config from decorator or use defaults
    const config = this.reflector.get<RateLimitConfig>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    ) || this.getDefaultConfig(req.route?.path);

    const rateLimiter = this.getRateLimiter(config);
    const key = this.generateKey(req, config.keyPrefix);

    try {
      await rateLimiter.consume(key);
      return true;
    } catch (rejRes) {
      const remainingTime = Math.round(rejRes.msBeforeNext / 1000);
      
      console.warn(`Rate limit exceeded for ${key}: ${req.ip} on ${req.url}`);
      
      throw new HttpException(
        {
          message: 'Too many requests. Try again later.',
          retryAfter: remainingTime,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private getRateLimiter(config: RateLimitConfig): RateLimiterPostgres {
    const key = `${config.keyPrefix || 'default'}_${config.points}_${config.duration}`;
    
    if (!this.rateLimiters.has(key)) {
      this.rateLimiters.set(key, new RateLimiterPostgres({
        storeClient: this.dataSource.driver['master'],
        tableName: 'rate_limiter',
        keyPrefix: config.keyPrefix || 'default',
        points: config.points,
        duration: config.duration,
      }));
    }
    
    return this.rateLimiters.get(key);
  }

  private generateKey(req: Request, prefix?: string): string {
    const baseKey = req.ip;
    const userKey = req.user?.id ? `user_${req.user.id}` : baseKey;
    return prefix ? `${prefix}_${userKey}` : userKey;
  }

  private getDefaultConfig(path?: string): RateLimitConfig {
    // Different limits for different endpoint types
    if (path?.includes('auth')) {
      return { points: 5, duration: 300, keyPrefix: 'auth' }; // 5 requests per 5 minutes
    }
    if (path?.includes('upload')) {
      return { points: 10, duration: 3600, keyPrefix: 'upload' }; // 10 uploads per hour
    }
    if (path?.includes('admin')) {
      return { points: 100, duration: 3600, keyPrefix: 'admin' }; // 100 requests per hour
    }
    
    return { points: 100, duration: 900, keyPrefix: 'general' }; // 100 requests per 15 minutes
  }
}