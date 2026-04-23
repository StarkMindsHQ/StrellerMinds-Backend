import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimitOptions';

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Decorator to apply rate limiting to a route handler
 * @param maxRequests Maximum number of requests allowed
 * @param windowMs Time window in milliseconds
 * @param options Additional rate limiting options
 */
export function RateLimit(
  maxRequests: number,
  windowMs: number,
  options?: Partial<RateLimitOptions>,
) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const rateLimitOptions: RateLimitOptions = {
      maxRequests,
      windowMs,
      ...options,
    };

    // Store options on the method
    SetMetadata(RATE_LIMIT_KEY, rateLimitOptions)(target, propertyKey, descriptor);

    // Build middleware to attach options to request
    const originalMethod = descriptor.value;
    descriptor.value = function (req: any, ...args: any[]) {
      req.rateLimitOptions = rateLimitOptions;
      return originalMethod.apply(this, [req, ...args]);
    };

    return descriptor;
  };
}
