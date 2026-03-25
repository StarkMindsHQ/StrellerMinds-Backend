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

@Injectable()
export class WebhookSecurityService {
  private readonly logger = new Logger(WebhookSecurityService.name);
  private readonly processedEvents = new Map<string, number>();
  private readonly rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  constructor(private configService: ConfigService) {}

  /**
   * Validate webhook signature
   */
  async validateSignature(
    payload: string,
    signature: string,
    timestamp?: string,
    config?: WebhookSecurityConfig,
  ): Promise<WebhookValidationResult> {
    try {
      if (!config?.signature) {
        return { isValid: false, error: 'Signature configuration not found' };
      }

      const { secret, algorithm, headerName, timestampHeader } = config.signature;

      // Check timestamp for replay protection
      if (timestampHeader && timestamp) {
        const now = Math.floor(Date.now() / 1000);
        const webhookTimestamp = parseInt(timestamp, 10);

        // Reject webhooks older than 5 minutes
        if (Math.abs(now - webhookTimestamp) > 300) {
          return {
            isValid: false,
            error: 'Webhook timestamp is too old or too far in the future',
          };
        }
      }

      // Verify signature based on provider
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
   * Check for replay attacks
   */
  checkReplayProtection(eventId: string, config?: WebhookSecurityConfig): WebhookValidationResult {
    if (!config?.replayProtection?.enabled) {
      return { isValid: true };
    }

    const { windowMs, maxDuplicates } = config.replayProtection;
    const now = Date.now();
    const existingTimestamp = this.processedEvents.get(eventId);

    if (existingTimestamp) {
      // Check if the event is within the replay window
      if (now - existingTimestamp < windowMs) {
        return {
          isValid: false,
          error: 'Duplicate webhook event detected (replay attack)',
        };
      }
    }

    // Clean up old events
    this.cleanupOldEvents(now - windowMs);

    // Store the current event
    this.processedEvents.set(eventId, now);

    return { isValid: true };
  }

  /**
   * Check rate limiting
   */
  checkRateLimit(identifier: string, config?: WebhookSecurityConfig): WebhookValidationResult {
    if (!config?.rateLimit) {
      return { isValid: true };
    }

    const { windowMs, maxRequests } = config.rateLimit;
    const now = Date.now();
    const key = identifier;

    const current = this.rateLimitStore.get(key);

    if (!current || now > current.resetTime) {
      // Reset or initialize counter
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { isValid: true };
    }

    if (current.count >= maxRequests) {
      return {
        isValid: false,
        error: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs}ms`,
      };
    }

    current.count++;
    return { isValid: true };
  }

  /**
   * Extract webhook event ID from payload
   */
  extractEventId(payload: any, provider: WebhookProvider): string | null {
    try {
      switch (provider) {
        case WebhookProvider.STRIPE:
          return payload.id || null;
        case WebhookProvider.PAYPAL:
          return payload.id || payload.resource?.id || null;
        case WebhookProvider.ZOOM:
          return payload.event?.id || payload.id || null;
        default:
          return payload.id || payload.eventId || null;
      }
    } catch (error) {
      this.logger.error(`Failed to extract event ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Get provider configuration
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
   * Verify Stripe webhook signature
   */
  private verifyStripeSignature(payload: string, signature: string, secret: string): string {
    const elements = signature.split(',');
    const timestamp = elements.find((el) => el.startsWith('t='))?.substring(2);

    if (!timestamp) {
      throw new Error('No timestamp found in Stripe signature');
    }

    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return `t=${timestamp},v1=${expectedSignature}`;
  }

  /**
   * Verify Zoom webhook signature
   */
  private verifyZoomSignature(
    payload: string,
    timestamp: string,
    signature: string,
    secret: string,
  ): string {
    const message = `v0:${timestamp}:${payload}`;
    const hash = crypto.createHmac('sha256', secret).update(message).digest('hex');

    return `v0=${hash}`;
  }

  /**
   * Verify PayPal webhook signature
   */
  private verifyPayPalSignature(payload: string, signature: string, secret: string): string {
    // PayPal uses a more complex verification process with API calls
    // For now, implement basic HMAC verification
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verify generic HMAC-SHA256 signature
   */
  private verifyHmacSignature(payload: string, signature: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Clean up old events from memory
   */
  private cleanupOldEvents(cutoffTime: number): void {
    for (const [eventId, timestamp] of this.processedEvents.entries()) {
      if (timestamp < cutoffTime) {
        this.processedEvents.delete(eventId);
      }
    }

    for (const [key, data] of this.rateLimitStore.entries()) {
      if (Date.now() > data.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Get client IP address from request
   */
  getClientIp(request: express.Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Get user agent from request
   */
  getUserAgent(request: express.Request): string {
    return request.headers['user-agent'] || 'unknown';
  }
}
