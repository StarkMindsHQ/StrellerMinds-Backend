import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import {
  RATE_LIMIT_METADATA_KEY,
  RateLimitDecoratorConfig,
} from '../decorators/rate-limit.decorator';
import { getEndpointRateLimit, getEnvironmentOverrides } from '../../config/rate-limit.config';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(options: ThrottlerModuleOptions, storage: ThrottlerStorage, reflector: Reflector) {
    super(options, storage, reflector);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use user id if available, otherwise fallback to IP
    return req.user?.id || req.headers['x-api-key'] || req.ip;
  }

  /**
   * Override to handle custom rate limit configurations
   */
  protected async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
    throttler: string,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get custom rate limit configuration from decorator metadata
    const customConfig = this.reflector.get<RateLimitDecoratorConfig>(
      RATE_LIMIT_METADATA_KEY,
      context.getHandler(),
    );

    // If custom config exists and skip is true, bypass rate limiting
    if (customConfig?.skip) {
      return true;
    }

    // Use custom configuration if available
    if (customConfig) {
      const endpointConfig = getEndpointRateLimit(customConfig.category, customConfig.endpoint);
      const overrides = getEnvironmentOverrides();

      // Apply overrides from environment variables
      const overrideKey = `${customConfig.category}_${customConfig.endpoint}`;
      const envOverride = overrides[overrideKey];

      if (envOverride) {
        limit = envOverride.limit;
        ttl = envOverride.ttl;
      } else if (endpointConfig) {
        limit = customConfig.limit || endpointConfig.limit;
        ttl = customConfig.ttl || endpointConfig.ttl;
      }
    }

    // Generate custom tracker key with prefix if available
    const tracker = await this.getTracker(request);
    const customPrefix = customConfig?.keyPrefix;
    const finalTracker = customPrefix ? `${customPrefix}:${tracker}` : tracker;

    // Use the custom tracker for rate limiting
    const key = `${throttler}:${finalTracker}`;

    const totalHits = await this.storageService.increment(key, ttl);

    if (totalHits > limit) {
      const ttlRemaining = await this.storageService.getTimeToExpire(key);
      response.header('Retry-After', Math.ceil(ttlRemaining / 1000));
      response.header('X-RateLimit-Limit', limit);
      response.header('X-RateLimit-Remaining', Math.max(0, limit - totalHits));
      response.header('X-RateLimit-Reset', new Date(Date.now() + ttlRemaining).toISOString());

      throw this.throttlers.get(throttler).throwThrottlingException();
    }

    response.header('X-RateLimit-Limit', limit);
    response.header('X-RateLimit-Remaining', Math.max(0, limit - totalHits));
    response.header('X-RateLimit-Reset', new Date(Date.now() + ttl * 1000).toISOString());

    return true;
  }

  /**
   * Enhanced error handling with custom messages
   */
  protected throwThrottlingException(): void {
    const error = new Error('Too Many Requests');
    (error as any).status = 429;
    (error as any).response = {
      statusCode: 429,
      message: 'Rate limit exceeded. Please try again later.',
      error: 'Too Many Requests',
    };
    throw error;
  }
}
