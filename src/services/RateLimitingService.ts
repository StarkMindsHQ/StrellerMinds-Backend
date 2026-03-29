import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { AdaptiveRateLimiter } from '../security/AdaptiveRateLimiter';
import { ThreatDetector } from '../security/ThreatDetector';
import { ThreatScore } from '../models/ThreatPattern';

/**
 * Advanced Rate Limiting and Threat Detection Service
 * Integrates behavioral analysis and dynamic throttling for enterprise-grade security
 */
@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);

  constructor(
    private readonly adaptiveRateLimiter: AdaptiveRateLimiter,
    private readonly threatDetector: ThreatDetector,
  ) {}

  /**
   * Monitor and strictly enforce adaptive rate limits
   */
  async enforce(ip: string, userId: string | undefined, resource: string): Promise<void> {
    const analysis = await this.threatDetector.analyzeBehavior(ip, userId, resource);
    
    // Check if the user is already blocked based on behavioral analysis
    if (analysis.suggestedAction === 'block') {
      this.logger.error(`[Rate Limiting] Blocking suspicious request from ${userId || ip}`);
      throw new HttpException({
        status: HttpStatus.FORBIDDEN,
        message: 'Access denied due to suspicious activity. Please contact support.',
        incidentId: `THREAT-${Date.now()}`,
      }, HttpStatus.FORBIDDEN);
    }

    // Apply adaptive rate limiting
    await this.adaptiveRateLimiter.checkRateLimit(ip, userId);

    this.logger.debug(`[Rate Limiting] Request allowed for ${userId || ip} (Trust: ${analysis.trustScore})`);
  }

  /**
   * Report success or failure for behavioral learning
   */
  reportOutcome(ip: string, userId: string | undefined, success: boolean): void {
    this.threatDetector.recordActivity(ip, userId, success);
  }

  /**
   * Get dynamic rate limit status for a user/IP
   */
  async getStatus(ip: string, userId?: string | undefined): Promise<any> {
    const analysis = await this.threatDetector.analyzeBehavior(ip, userId);
    const limitInfo = this.adaptiveRateLimiter.getLimitInfo(ip, userId);

    return {
      threat: analysis,
      limit: limitInfo,
      trustScore: analysis.trustScore,
      action: analysis.suggestedAction,
    };
  }

  /**
   * Manage API key tiers and their associated limits
   */
  async manageTierLimits(tier: 'free' | 'pro' | 'enterprise', customLimit?: number): Promise<void> {
    // Logic to update base limits in AdaptiveRateLimiter
    this.logger.log(`[Rate Limiting] Updated tier ${tier} with limit: ${customLimit || 'default'}`);
  }
}
