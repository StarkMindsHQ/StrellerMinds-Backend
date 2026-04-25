import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RateLimiterService } from './rate-limiter.service';

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  keyExtractor?: (request: any) => string;
}

/**
 * Rate limiting interceptor for request throttling
 * Tracks requests by IP address or custom key
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  constructor(private readonly rateLimiterService: RateLimiterService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get rate limit options from request (set by decorator)
    const options = (request as any).rateLimitOptions as RateLimitOptions;

    if (!options) {
      return next.handle();
    }

    // Extract key (IP address by default)
    const key = this.getKey(request, options);

    // Check if request is allowed
    const result = this.rateLimiterService.isAllowed(key, options.maxRequests, options.windowMs);

    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', options.maxRequests);
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader('X-RateLimit-Reset', result.resetTime);

    if (!result.allowed) {
      const resetIn = Math.ceil((result.resetTime - Date.now()) / 1000);
      throw new BadRequestException({
        statusCode: 429,
        message: 'Too many requests. Please try again later.',
        retryAfter: resetIn,
        resetTime: new Date(result.resetTime),
      });
    }

    return next.handle();
  }

  private getKey(request: any, options: RateLimitOptions): string {
    // Use custom key extractor if provided
    if (options.keyExtractor) {
      return options.keyExtractor(request);
    }

    // Default: use IP address
    const ip =
      request.ip ||
      request.connection.remoteAddress ||
      request.headers['x-forwarded-for'] ||
      'unknown';

    return `${(request as any).rateLimitOptions?.keyPrefix || 'rl:'}${ip}`;
  }
}
