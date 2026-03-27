import { Injectable, ExecutionContext, Inject } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage, ThrottlerException } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RateLimitAnalytics } from '../entities/rate-limit-analytics.entity';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class AdvancedThrottlerGuard extends ThrottlerGuard {
  private readonly redis: Redis;

  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly configService: ConfigService,
    @InjectRepository(RateLimitAnalytics)
    private readonly analyticsRepository: Repository<RateLimitAnalytics>,
  ) {
    super(options, storageService, reflector);
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
    });
  }

  async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
    throttler: any,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;
    const userId = request.user?.id;
    const endpoint = request.url;
    const method = request.method;

    // 1. Check IP blocking
    const blockKey = `ratelimit:block:${ip}`;
    const isBlocked = await this.redis.get(blockKey);
    if (isBlocked) {
      const remainingTtl = await this.redis.ttl(blockKey);
      throw new ThrottlerException(
        `Too many violations. Restricted for ${Math.ceil(remainingTtl / 60)} more minutes.`,
      );
    }

    try {
      // Use super's logic for tracking regular rate limiting
      return await super.handleRequest(context, limit, ttl, throttler);
    } catch (error) {
      if (error instanceof ThrottlerException) {
        // Triggered when rate limit is exceeded
        await this.handleViolation(ip, userId, endpoint, method, throttler.name);
      }
      throw error;
    }
  }

  private async handleViolation(
    ip: string,
    userId: string | undefined,
    endpoint: string,
    method: string,
    throttlerName: string,
  ) {
    const violationKey = `ratelimit:violations:${ip}`;
    const violations = await this.redis.incr(violationKey);
    
    // Set expiry if new violation count
    if (violations === 1) {
      await this.redis.expire(violationKey, 3600); // 1 hour window
    }

    // Progressive blocking logic
    const blockKey = `ratelimit:block:${ip}`;
    if (violations >= 10) {
      // 24-hour block
      await this.redis.setex(blockKey, 86400, 'blocked');
    } else if (violations >= 5) {
      // 1-hour block
      await this.redis.setex(blockKey, 3600, 'blocked');
    }

    // Analytics logging
    try {
      const log = this.analyticsRepository.create({
        ip,
        userId,
        endpoint,
        method,
        throttlerName,
        violationCount: violations,
      });
      await this.analyticsRepository.save(log);
    } catch (analyticsError) {
      // Don't fail the request because of analytics logging
      console.error('Failed to log rate limit analytics:', analyticsError);
    }
  }
}
