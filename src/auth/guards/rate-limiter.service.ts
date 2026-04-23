import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * In-memory rate limiting store (for development/single-instance)
 * In production, use Redis or a dedicated rate limiting service
 */
@Injectable()
export class RateLimiterService {
  private store = new Map<string, { count: number; resetTime: number }>();

  /**
   * Check if a request should be allowed based on rate limit
   */
  isAllowed(
    key: string,
    maxRequests: number,
    windowMs: number,
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    // Key doesn't exist or window expired
    if (!entry || now > entry.resetTime) {
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs,
      };
    }

    // Within existing window
    if (entry.count < maxRequests) {
      entry.count++;
      return {
        allowed: true,
        remaining: maxRequests - entry.count,
        resetTime: entry.resetTime,
      };
    }

    // Limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Get current rate limit status for a key
   */
  getStatus(
    key: string,
    maxRequests: number,
    windowMs: number,
  ): { count: number; remaining: number; resetTime: number; resetIn: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      return {
        count: 0,
        remaining: maxRequests,
        resetTime: now + windowMs,
        resetIn: windowMs,
      };
    }

    const resetIn = Math.max(0, entry.resetTime - now);
    return {
      count: entry.count,
      remaining: Math.max(0, maxRequests - entry.count),
      resetTime: entry.resetTime,
      resetIn,
    };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Reset all rate limits (useful for testing)
   */
  resetAll(): void {
    this.store.clear();
  }

  /**
   * Clean up expired entries (run periodically)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }
}
