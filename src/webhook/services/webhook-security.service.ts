import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as express from 'express';
import {
  WebhookEvent,
  WebhookValidationResult,
  WebhookSecurityConfig,
  WebhookProvider,
  WebhookProviderConfig,
} from '../interfaces/webhook.interfaces';

/**
 * Webhook Security Service
 *
 * Provides comprehensive security validation for webhook endpoints including:
 * - Cryptographic signature verification
 * - Replay attack prevention
 * - Rate limiting
 * - Provider-specific security configurations
 *
 * Business Rules:
 * 1. All webhooks must have valid cryptographic signatures
 * 2. Webhooks older than 5 minutes are rejected (replay protection)
 * 3. Rate limits are enforced per provider and IP address
 * 4. Duplicate events within time windows are blocked
 * 5. All security events are logged for audit purposes
 *
 * @example
 * ```typescript
 * const securityService = new WebhookSecurityService(configService);
 * const result = await securityService.validateSignature(
 *   payload,
 *   signature,
 *   timestamp,
 *   providerConfig
 * );
 * if (!result.isValid) {
 *   throw new UnauthorizedException(result.error);
 * }
 * ```
 */
@Injectable()
export class WebhookSecurityService {
  private readonly logger = new Logger(WebhookSecurityService.name);

  /**
   * In-memory storage for processed webhook events
   * Key: eventId, Value: timestamp
   * Used for replay attack prevention
   */
  private readonly processedEvents = new Map<string, number>();

  /**
   * In-memory storage for rate limiting
   * Key: provider:ipAddress, Value: { count, resetTime }
   * Used for rate limiting enforcement
   */
  private readonly rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  constructor(private configService: ConfigService) {}

  /**
   * Validates webhook cryptographic signature
   *
   * Implements provider-specific signature verification algorithms:
   * - Stripe: Uses timestamp + payload + secret with HMAC-SHA256
   * - Zoom: Uses v0 format with timestamp + payload + secret
   * - PayPal: Uses HMAC-SHA256 with payload + secret
   * - Custom: Generic HMAC-SHA256 implementation
   *
   * Security Considerations:
   * - Uses constant-time comparison to prevent timing attacks
   * - Validates timestamp to prevent replay attacks
   * - Rejects malformed signatures immediately
   *
   * @param payload - Raw webhook payload as string
   * @param signature - Cryptographic signature from webhook provider
   * @param timestamp - Optional timestamp for replay protection
   * @param config - Security configuration for the provider
   * @returns Validation result with isValid flag and error details
   *
   * @example
   * ```typescript
   * const result = await this.validateSignature(
   *   '{"event": "payment.succeeded"}',
   *   't=1640995200,v1=abc123...',
   *   '1640995200',
   *   stripeConfig
   * );
   * ```
   */
  async validateSignature(
    payload: string,
    signature: string,
    timestamp?: string,
    config?: WebhookSecurityConfig,
  ): Promise<WebhookValidationResult> {
    try {
      // Validate configuration exists
      if (!config?.signature) {
        return { isValid: false, error: 'Signature configuration not found' };
      }

      const { secret, algorithm, headerName, timestampHeader } = config.signature;

      // Timestamp validation for replay protection
      // Business Rule: Reject webhooks older than 5 minutes to prevent replay attacks
      if (timestampHeader && timestamp) {
        const now = Math.floor(Date.now() / 1000);
        const webhookTimestamp = parseInt(timestamp, 10);

        // Security: 5-minute window allows for network delays but prevents replay attacks
        if (Math.abs(now - webhookTimestamp) > 300) {
          return {
            isValid: false,
            error: 'Webhook timestamp is too old or too far in the future',
          };
        }
      }

      // Provider-specific signature verification
      let expectedSignature: string;

      switch (algorithm) {
        case 'stripe':
          expectedSignature = this.verifyStripeSignature(payload, signature, secret);
          break;
        case 'zoom':
          expectedSignature = this.verifyZoomSignature(payload, timestamp, signature, secret);
          break;
        case 'paypal':
          expectedSignature = this.verifyPayPalSignature(payload, signature, secret);
          break;
        case 'hmac-sha256':
          expectedSignature = this.verifyHmacSignature(payload, signature, secret);
          break;
        default:
          return { isValid: false, error: `Unsupported signature algorithm: ${algorithm}` };
      }

      // Security: Use constant-time comparison to prevent timing attacks
      // This prevents attackers from learning about the secret through timing analysis
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );

      return {
        isValid,
        error: isValid ? undefined : 'Invalid signature',
      };
    } catch (error) {
      this.logger.error(`Signature validation error: ${error.message}`, error.stack);
      return {
        isValid: false,
        error: `Signature validation failed: ${error.message}`,
      };
    }
  }

  /**
   * Implements replay attack protection
   *
   * Business Rules:
   * 1. Each webhook event ID can only be processed once within the time window
   * 2. Time window is configurable (default: 5 minutes)
   * 3. Old events are automatically cleaned up to prevent memory leaks
   * 4. Memory-based storage for performance (Redis for distributed systems)
   *
   * Algorithm:
   * 1. Extract unique event ID from webhook payload
   * 2. Check if event ID exists in processed events
   * 3. If exists and within time window → reject (replay attack)
   * 4. If not exists or outside window → accept and store
   * 5. Clean up old events to maintain memory efficiency
   *
   * @param eventId - Unique identifier for the webhook event
   * @param config - Security configuration containing replay protection settings
   * @returns Validation result indicating if this is a replay attack
   *
   * @example
   * ```typescript
   * const result = this.checkReplayProtection('evt_123456', config);
   * if (!result.isValid) {
   *   this.logger.warn('Replay attack detected', { eventId });
   * }
   * ```
   */
  checkReplayProtection(eventId: string, config?: WebhookSecurityConfig): WebhookValidationResult {
    // Skip replay protection if disabled
    if (!config?.replayProtection?.enabled) {
      return { isValid: true };
    }

    const { windowMs, maxDuplicates } = config.replayProtection;
    const now = Date.now();
    const existingTimestamp = this.processedEvents.get(eventId);

    // Check for duplicate within time window (replay attack detection)
    if (existingTimestamp) {
      // Business Rule: Same event ID within time window indicates replay attack
      if (now - existingTimestamp < windowMs) {
        return {
          isValid: false,
          error: 'Duplicate webhook event detected (replay attack)',
        };
      }
    }

    // Performance: Clean up old events to prevent memory leaks
    // This runs periodically to maintain memory efficiency
    this.cleanupOldEvents(now - windowMs);

    // Store current event for future replay protection
    this.processedEvents.set(eventId, now);

    return { isValid: true };
  }

  /**
   * Implements rate limiting for webhook endpoints
   *
   * Business Rules:
   * 1. Rate limits are enforced per provider and IP address combination
   * 2. Time windows are configurable (default: 1 minute)
   * 3. Limits reset automatically at the end of each window
   * 4. Memory-based storage with automatic cleanup
   *
   * Algorithm:
   * 1. Create unique key from provider and IP address
   * 2. Check existing rate limit data for the key
   * 3. If window expired → reset counter
   * 4. If within window and under limit → increment counter
   * 5. If limit exceeded → reject request
   *
   * Security Benefits:
   * - Prevents DoS attacks through webhook flooding
   * - Ensures fair resource allocation
   * - Provides configurable limits per provider
   *
   * @param identifier - Unique identifier (provider:ipAddress)
   * @param config - Security configuration containing rate limit settings
   * @returns Validation result indicating if rate limit is exceeded
   *
   * @example
   * ```typescript
   * const result = this.checkRateLimit('stripe:192.168.1.1', config);
   * if (!result.isValid) {
   *   throw new BadRequestException('Rate limit exceeded');
   * }
   * ```
   */
  checkRateLimit(identifier: string, config?: WebhookSecurityConfig): WebhookValidationResult {
    // Skip rate limiting if not configured
    if (!config?.rateLimit) {
      return { isValid: true };
    }

    const { windowMs, maxRequests } = config.rateLimit;
    const now = Date.now();
    const key = identifier;

    const current = this.rateLimitStore.get(key);

    // Reset counter if window has expired
    if (!current || now > current.resetTime) {
      // New window starts
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { isValid: true };
    }

    // Check if rate limit exceeded
    if (current.count >= maxRequests) {
      return {
        isValid: false,
        error: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs}ms`,
      };
    }

    // Increment counter for current window
    current.count++;
    return { isValid: true };
  }

  /**
   * Extracts unique event ID from webhook payload
   *
   * Business Rules:
   * 1. Each provider has different payload structures
   * 2. Event ID is used for replay attack prevention
   * 3. Fallback to payload.id if provider-specific field not found
   * 4. Returns null if no suitable ID found (replay protection disabled)
   *
   * Provider-specific Logic:
   * - Stripe: payload.id (standard Stripe event ID)
   * - PayPal: payload.id or payload.resource.id (PayPal event structure)
   * - Zoom: payload.event.id or payload.id (Zoom webhook structure)
   * - Custom: payload.id or payload.eventId (generic fallback)
   *
   * @param payload - Webhook payload object
   * @param provider - Webhook provider enum
   * @returns Unique event ID or null if not found
   *
   * @example
   * ```typescript
   * const eventId = this.extractEventId(stripePayload, WebhookProvider.STRIPE);
   * // Returns: 'evt_1234567890abcdef'
   * ```
   */
  extractEventId(payload: any, provider: WebhookProvider): string | null {
    try {
      switch (provider) {
        case WebhookProvider.STRIPE:
          // Stripe events have a standard 'id' field
          return payload.id || null;

        case WebhookProvider.PAYPAL:
          // PayPal events may have nested structure
          return payload.id || payload.resource?.id || null;

        case WebhookProvider.ZOOM:
          // Zoom webhooks have different structures
          return payload.event?.id || payload.id || null;

        default:
          // Generic fallback for custom providers
          return payload.id || payload.eventId || null;
      }
    } catch (error) {
      this.logger.error(`Failed to extract event ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Retrieves security configuration for webhook providers
   *
   * Business Rules:
   * 1. Each provider has specific security requirements
   * 2. Configuration includes signature, rate limiting, and replay protection
   * 3. Environment variables provide secrets and settings
   * 4. Providers can be individually enabled/disabled
   *
   * Security Defaults:
   * - Stripe: 100 requests/minute, 5-minute replay window
   * - PayPal: 50 requests/minute, 5-minute replay window
   * - Zoom: 200 requests/minute, 5-minute replay window
   * - Custom: 100 requests/minute, 5-minute replay window
   *
   * @param provider - Webhook provider to get configuration for
   * @returns Complete provider configuration or null if not found
   *
   * @example
   * ```typescript
   * const config = this.getProviderConfig(WebhookProvider.STRIPE);
   * if (!config?.enabled) {
   *   throw new BadRequestException('Stripe webhooks disabled');
   * }
   * ```
   */
  getProviderConfig(provider: WebhookProvider): WebhookProviderConfig | null {
    const configs: Record<WebhookProvider, WebhookProviderConfig> = {
      [WebhookProvider.STRIPE]: {
        provider: WebhookProvider.STRIPE,
        security: {
          signature: {
            secret: this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '',
            algorithm: 'stripe',
            headerName: 'stripe-signature',
          },
          rateLimit: {
            windowMs: 60000, // 1 minute
            maxRequests: 100,
          },
          replayProtection: {
            enabled: true,
            windowMs: 300000, // 5 minutes
            maxDuplicates: 1,
          },
          logging: {
            enabled: true,
            includePayload: false,
            includeHeaders: true,
            retentionDays: 30,
          },
        },
        endpoints: ['/webhooks/stripe'],
        enabled: true,
      },
      [WebhookProvider.PAYPAL]: {
        provider: WebhookProvider.PAYPAL,
        security: {
          signature: {
            secret: this.configService.get<string>('PAYPAL_WEBHOOK_SECRET') || '',
            algorithm: 'paypal',
            headerName: 'paypal-auth-algo',
            timestampHeader: 'paypal-transmission-id',
          },
          rateLimit: {
            windowMs: 60000,
            maxRequests: 50,
          },
          replayProtection: {
            enabled: true,
            windowMs: 300000,
            maxDuplicates: 1,
          },
          logging: {
            enabled: true,
            includePayload: false,
            includeHeaders: true,
            retentionDays: 30,
          },
        },
        endpoints: ['/webhooks/paypal'],
        enabled: true,
      },
      [WebhookProvider.ZOOM]: {
        provider: WebhookProvider.ZOOM,
        security: {
          signature: {
            secret: this.configService.get<string>('ZOOM_WEBHOOK_SECRET') || '',
            algorithm: 'zoom',
            headerName: 'x-zm-signature',
            timestampHeader: 'x-zm-request-timestamp',
          },
          rateLimit: {
            windowMs: 60000,
            maxRequests: 200,
          },
          replayProtection: {
            enabled: true,
            windowMs: 300000,
            maxDuplicates: 1,
          },
          logging: {
            enabled: true,
            includePayload: false,
            includeHeaders: true,
            retentionDays: 30,
          },
        },
        endpoints: ['/integrations/zoom/webhook'],
        enabled: true,
      },
      [WebhookProvider.CUSTOM]: {
        provider: WebhookProvider.CUSTOM,
        security: {
          signature: {
            secret: this.configService.get<string>('CUSTOM_WEBHOOK_SECRET') || '',
            algorithm: 'hmac-sha256',
            headerName: 'x-signature',
            timestampHeader: 'x-timestamp',
          },
          rateLimit: {
            windowMs: 60000,
            maxRequests: 100,
          },
          replayProtection: {
            enabled: true,
            windowMs: 300000,
            maxDuplicates: 1,
          },
          logging: {
            enabled: true,
            includePayload: false,
            includeHeaders: true,
            retentionDays: 30,
          },
        },
        endpoints: ['/webhooks/custom'],
        enabled: false,
      },
    };

    return configs[provider] || null;
  }

  /**
   * Verifies Stripe webhook signature
   *
   * Algorithm Implementation:
   * 1. Parse signature to extract timestamp and signature components
   * 2. Create signed payload: timestamp + '.' + raw payload
   * 3. Compute HMAC-SHA256 using webhook secret
   * 4. Format expected signature: t=timestamp,v1=hash
   *
   * Security Considerations:
   * - Uses HMAC-SHA256 for cryptographic security
   * - Includes timestamp to prevent replay attacks
   * - Follows Stripe's official signature verification process
   *
   * @param payload - Raw webhook payload
   * @param signature - Stripe signature header value
   * @param secret - Stripe webhook secret
   * @returns Expected signature for comparison
   *
   * @example
   * ```typescript
   * const expected = this.verifyStripeSignature(
   *   '{"id": "evt_123"}',
   *   't=1640995200,v1=abc123',
   *   'whsec_...'
   * );
   * ```
   */
  private verifyStripeSignature(payload: string, signature: string, secret: string): string {
    // Parse Stripe signature format: t=timestamp,v1=signature
    const elements = signature.split(',');
    const timestamp = elements.find((el) => el.startsWith('t='))?.substring(2);

    if (!timestamp) {
      throw new Error('No timestamp found in Stripe signature');
    }

    // Create signed payload following Stripe specification
    const signedPayload = `${timestamp}.${payload}`;

    // Compute HMAC-SHA256 hash
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Return in Stripe format
    return `t=${timestamp},v1=${expectedSignature}`;
  }

  /**
   * Verifies Zoom webhook signature
   *
   * Algorithm Implementation:
   * 1. Create message: v0:timestamp:payload
   * 2. Compute HMAC-SHA256 using webhook secret
   * 3. Format as v0=hash
   *
   * Security Considerations:
   * - Follows Zoom's v0 signature specification
   * - Includes timestamp for replay protection
   * - Uses HMAC-SHA256 for cryptographic security
   *
   * @param payload - Raw webhook payload
   * @param timestamp - Zoom request timestamp
   * @param signature - Zoom signature header value
   * @param secret - Zoom webhook secret
   * @returns Expected signature for comparison
   */
  private verifyZoomSignature(
    payload: string,
    timestamp: string,
    signature: string,
    secret: string,
  ): string {
    // Create message following Zoom v0 specification
    const message = `v0:${timestamp}:${payload}`;

    // Compute HMAC-SHA256 hash
    const hash = crypto.createHmac('sha256', secret).update(message).digest('hex');

    // Return in Zoom v0 format
    return `v0=${hash}`;
  }

  /**
   * Verifies PayPal webhook signature
   *
   * Algorithm Implementation:
   * 1. Uses HMAC-SHA256 with payload and secret
   * 2. PayPal has more complex verification in production
   * 3. This is a simplified implementation for demonstration
   *
   * Note: Production PayPal verification requires additional
   * API calls to verify the transmission signature
   *
   * @param payload - Raw webhook payload
   * @param signature - PayPal signature
   * @param secret - PayPal webhook secret
   * @returns Expected signature for comparison
   */
  private verifyPayPalSignature(payload: string, signature: string, secret: string): string {
    // PayPal uses a more complex verification process with API calls
    // For now, implement basic HMAC verification
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verifies generic HMAC-SHA256 signature
   *
   * Algorithm Implementation:
   * 1. Compute HMAC-SHA256 with payload and secret
   * 2. Return hex-encoded hash
   *
   * Use Cases:
   * - Custom webhook providers
   * - Testing and development
   * - Generic HMAC verification
   *
   * @param payload - Raw webhook payload
   * @param signature - Expected signature
   * @param secret - Shared secret key
   * @returns Computed signature for comparison
   */
  private verifyHmacSignature(payload: string, signature: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Cleans up old events and rate limit data
   *
   * Performance Optimization:
   * - Prevents memory leaks by removing expired data
   * - Runs periodically during webhook processing
   * - Maintains efficient memory usage
   *
   * Algorithm:
   * 1. Iterate through processed events
   * 2. Remove events older than cutoff time
   * 3. Clean up expired rate limit entries
   *
   * @param cutoffTime - Timestamp threshold for cleanup
   */
  private cleanupOldEvents(cutoffTime: number): void {
    // Clean up old processed events
    for (const [eventId, timestamp] of this.processedEvents.entries()) {
      if (timestamp < cutoffTime) {
        this.processedEvents.delete(eventId);
      }
    }

    // Clean up expired rate limit data
    for (const [key, data] of this.rateLimitStore.entries()) {
      if (Date.now() > data.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Extracts client IP address from HTTP request
   *
   * Security Considerations:
   * - Handles various proxy configurations
   * - Uses X-Forwarded-For header when available
   * - Falls back to connection remote address
   * - Returns 'unknown' if IP cannot be determined
   *
   * @param request - Express request object
   * @returns Client IP address or 'unknown'
   */
  getClientIp(request: express.Request): string {
    return (
      // Check for proxy-forwarded IP first
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      // Check for real IP header
      (request.headers['x-real-ip'] as string) ||
      // Fall back to connection remote address
      (request as any).connection?.remoteAddress ||
      (request as any).socket?.remoteAddress ||
      // Default if cannot determine
      'unknown'
    );
  }

  /**
   * Extracts user agent from HTTP request
   *
   * Business Use:
   * - Logging and analytics
   * - Security monitoring
   * - Debugging webhook issues
   *
   * @param request - Express request object
   * @returns User agent string or 'unknown'
   */
  getUserAgent(request: express.Request): string {
    return request.headers['user-agent'] || 'unknown';
  }
}
