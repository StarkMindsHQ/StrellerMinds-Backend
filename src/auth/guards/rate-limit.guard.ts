import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';
import { RATE_LIMIT_CONFIGS } from './rate-limit.config';

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIGS;

/**
 * Rate limiting guard for protecting endpoints from brute force attacks
 * Usage: @UseGuards(RateLimitGuard(RateLimitType.LOGIN))
 */
export function RateLimitGuard(type: RateLimitType) {
  @Injectable()
  class RateLimitGuardImpl implements CanActivate {
    constructor(public rateLimiterService: RateLimiterService) {}

    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest();
      const response = context.switchToHttp().getResponse();

      const config = RATE_LIMIT_CONFIGS[type];
      const clientIp = this.getClientIp(request);
      const key = `${config.keyPrefix}${clientIp}`;

      // Check rate limit
      const result = this.rateLimiterService.isAllowed(key, config.maxRequests, config.windowMs);

      // Set rate limit headers
      response.setHeader('X-RateLimit-Limit', config.maxRequests);
      response.setHeader('X-RateLimit-Remaining', result.remaining);
      response.setHeader('X-RateLimit-Reset', result.resetTime);

      if (!result.allowed) {
        const resetInSeconds = Math.ceil((result.resetTime - Date.now()) / 1000);
        response.setHeader('Retry-After', resetInSeconds);

        throw new BadRequestException({
          statusCode: 429,
          message: `Too many ${type.toLowerCase()} attempts. Please try again after ${resetInSeconds} seconds.`,
          error: 'Too Many Requests',
          type,
          retryAfter: resetInSeconds,
          resetTime: new Date(result.resetTime),
        });
      }

      return true;
    }

    public getClientIp(request: any): string {
      return (
        request.ip ||
        request.connection?.remoteAddress ||
        request.headers['x-forwarded-for'] ||
        'unknown'
      );
    }
  }

  return RateLimitGuardImpl;
}
