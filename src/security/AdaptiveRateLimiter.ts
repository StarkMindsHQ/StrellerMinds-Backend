import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ThreatDetector } from './ThreatDetector';

/**
 * Adaptive Rate Limiter Service
 * Dynamically adjusts rate limits based on user trust and behavioral patterns
 */
@Injectable()
export class AdaptiveRateLimiter {
  private readonly logger = new Logger(AdaptiveRateLimiter.name);
  private limits: Map<string, { count: number, reset: number }> = new Map();
  private readonly REFILL_INTERVAL_MS = 60000; // 1 minute window

  constructor(private readonly threatDetector: ThreatDetector) {}

  /**
   * Check if a request is within the adaptive rate limits
   */
  async checkRateLimit(ip: string, userId?: string): Promise<boolean> {
    const key = userId || ip;
    const now = Date.now();
    const entry = this.limits.get(key) || { count: 0, reset: now + this.REFILL_INTERVAL_MS };

    // Reset window if needed
    if (now > entry.reset) {
      entry.count = 0;
      entry.reset = now + this.REFILL_INTERVAL_MS;
    }

    // Get adaptive limits from threat/trust analyzer
    const analysis = await this.threatDetector.analyzeBehavior(ip, userId);
    const baseLimit = this.getBaseLimit(userId);
    const adaptiveLimit = this.calculateAdaptiveLimit(baseLimit, analysis.trustScore, analysis.score);

    if (entry.count >= adaptiveLimit) {
      this.logger.warn(`[Rate Limiter] Limit exceeded for ${key}. Current rate: ${entry.count}/${adaptiveLimit}`);
      throw new HttpException({
        status: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.round((entry.reset - now) / 1000),
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    entry.count++;
    this.limits.set(key, entry);
    return true;
  }

  /**
   * Calculate adaptive limit based on trust and threat
   */
  private calculateAdaptiveLimit(baseLimit: number, trustScore: number, threatScore: number): number {
    // Increase limit for high trust (up to 2x)
    const trustMultiplier = 1 + (trustScore / 100);
    // Decrease limit for high threat (down to 10%)
    const threatMultiplier = Math.max(0.1, 1 - (threatScore / 100));

    return Math.floor(baseLimit * trustMultiplier * threatMultiplier);
  }

  /**
   * Determine base limit based on user tier or role
   */
  private getBaseLimit(userId?: string): number {
    if (!userId) return 100; // Anonymous
    // Mock user tier logic
    return 1000; // Authenticated
  }

  /**
   * Reset rate limit for a specific user/IP
   */
  resetLimit(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Get dynamic rate limit info
   */
  getLimitInfo(ip: string, userId?: string): any {
    const key = userId || ip;
    return this.limits.get(key);
  }
}
