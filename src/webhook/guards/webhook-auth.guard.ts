import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { WebhookSecurityService } from '../services/webhook-security.service';
import { WebhookLoggingService } from '../services/webhook-logging.service';
import { WebhookProvider } from '../interfaces/webhook.interfaces';

/**
 * Webhook Authentication Guard
 *
 * Provides comprehensive security validation for webhook endpoints including:
 * - Cryptographic signature verification
 * - Replay attack prevention
 * - Rate limiting enforcement
 * - Request metadata extraction
 * - Security event logging
 *
 * Security Architecture:
 * 1. Multi-layered validation approach
 * 2. Fail-safe security defaults
 * 3. Comprehensive audit logging
 * 4. Performance-optimized execution
 * 5. Provider-specific security handling
 *
 * Business Rules:
 * 1. All webhook requests must pass security validation
 * 2. Invalid signatures are immediately rejected
 * 3. Replay attacks are blocked with detailed logging
 * 4. Rate limits are enforced per provider and IP
 * 5. All security events are logged for monitoring
 *
 * @example
 * ```typescript
 * @Controller('webhooks')
 * export class WebhookController {
 *   @Post('stripe')
 *   @UseGuards(WebhookAuthGuard)
 *   @SetWebhookProvider(WebhookProvider.STRIPE)
 *   async handleWebhook(@Req() request: any) {
 *     const event = request.webhookPayload; // Already validated
 *   }
 * }
 * ```
 */
@Injectable()
export class WebhookAuthGuard implements CanActivate {
  private readonly logger = new Logger(WebhookAuthGuard.name);

  constructor(
    private readonly webhookSecurityService: WebhookSecurityService,
    private readonly webhookLoggingService: WebhookLoggingService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Validates webhook request through comprehensive security checks
   *
   * Security Validation Pipeline:
   * 1. Provider identification and configuration retrieval
   * 2. Request metadata extraction (headers, IP, user agent)
   * 3. Cryptographic signature verification
   * 4. Replay attack prevention
   * 5. Rate limiting enforcement
   * 6. Security event logging
   * 7. Request context enrichment
   *
   * Performance Considerations:
   * - Early termination on validation failures
   * - Parallel validation where possible
   * - Efficient memory usage for tracking
   * - Minimal overhead for valid requests
   *
   * @param context - NestJS execution context
   * @returns True if request passes all security validations
   * @throws UnauthorizedException for security validation failures
   * @throws BadRequestException for malformed requests
   *
   * @example
   * ```typescript
   * // Request flow through guard:
   * 1. Extract provider from route/metadata
   * 2. Get provider security configuration
   * 3. Validate webhook signature
   * 4. Check for replay attacks
   * 5. Enforce rate limits
   * 6. Log security event
   * 7. Enrich request with validated data
   * ```
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    try {
      // Step 1: Identify webhook provider from request
      const provider = this.extractProvider(request);
      if (!provider) {
        throw new BadRequestException('Webhook provider not specified');
      }

      // Step 2: Retrieve provider-specific security configuration
      const providerConfig = this.webhookSecurityService.getProviderConfig(provider);
      if (!providerConfig || !providerConfig.enabled) {
        throw new UnauthorizedException(`Webhook provider ${provider} is not enabled`);
      }

      // Step 3: Extract request metadata for security validation
      const payload = request.body;
      const headers = request.headers as Record<string, string>;
      const signature = headers[providerConfig.security.signature.headerName];
      const timestamp = headers[providerConfig.security.signature.timestampHeader || ''];

      // Validate required security headers
      if (!signature) {
        throw new UnauthorizedException('Missing webhook signature');
      }

      // Step 4: Extract raw body for signature verification
      const rawBody = this.getRawBody(request);
      if (!rawBody) {
        throw new BadRequestException('Raw body is required for signature verification');
      }

      // Step 5: Perform cryptographic signature verification
      const signatureResult = await this.webhookSecurityService.validateSignature(
        rawBody,
        signature,
        timestamp,
        providerConfig.security,
      );

      if (!signatureResult.isValid) {
        // Log failed signature validation
        await this.logWebhookEvent({
          provider,
          eventType: 'unknown',
          status: 'failed',
          duration: Date.now() - startTime,
          error: signatureResult.error,
          headers,
          ipAddress: this.webhookSecurityService.getClientIp(request),
          userAgent: this.webhookSecurityService.getUserAgent(request),
        });

        throw new UnauthorizedException(signatureResult.error || 'Invalid webhook signature');
      }

      // Step 6: Implement replay attack prevention
      const eventId = this.webhookSecurityService.extractEventId(payload, provider);
      if (eventId) {
        const replayResult = this.webhookSecurityService.checkReplayProtection(
          eventId,
          providerConfig.security,
        );

        if (!replayResult.isValid) {
          // Log replay attack attempt
          await this.logWebhookEvent({
            provider,
            eventType: payload.type || 'unknown',
            status: 'failed',
            duration: Date.now() - startTime,
            error: replayResult.error,
            headers,
            ipAddress: this.webhookSecurityService.getClientIp(request),
            userAgent: this.webhookSecurityService.getUserAgent(request),
          });

          throw new UnauthorizedException(replayResult.error || 'Replay attack detected');
        }
      }

      // Step 7: Enforce rate limiting
      const clientIp = this.webhookSecurityService.getClientIp(request);
      const rateLimitResult = this.webhookSecurityService.checkRateLimit(
        `${provider}:${clientIp}`,
        providerConfig.security,
      );

      if (!rateLimitResult.isValid) {
        // Log rate limit violation
        await this.logWebhookEvent({
          provider,
          eventType: payload.type || 'unknown',
          status: 'failed',
          duration: Date.now() - startTime,
          error: rateLimitResult.error,
          headers,
          ipAddress: clientIp,
          userAgent: this.webhookSecurityService.getUserAgent(request),
        });

        throw new BadRequestException(rateLimitResult.error || 'Rate limit exceeded');
      }

      // Step 8: Enrich request with validated data for downstream handlers
      request.webhookProvider = provider;
      request.webhookPayload = payload;
      request.webhookEventId = eventId;

      // Step 9: Log successful security validation
      if (providerConfig.security.logging.enabled) {
        await this.logWebhookEvent({
          provider,
          eventType: payload.type || 'unknown',
          status: 'success',
          duration: Date.now() - startTime,
          headers: providerConfig.security.logging.includeHeaders ? headers : undefined,
          payload: providerConfig.security.logging.includePayload ? payload : undefined,
          ipAddress: clientIp,
          userAgent: this.webhookSecurityService.getUserAgent(request),
        });
      }

      return true;
    } catch (error) {
      // Comprehensive error logging for security monitoring
      const duration = Date.now() - startTime;

      await this.logWebhookEvent({
        provider: this.extractProvider(request) || 'unknown',
        eventType: request.body?.type || 'unknown',
        status: 'failed',
        duration,
        error: error.message,
        headers: request.headers as Record<string, string>,
        ipAddress: this.webhookSecurityService.getClientIp(request),
        userAgent: this.webhookSecurityService.getUserAgent(request),
      });

      throw error;
    }
  }

  /**
   * Extracts webhook provider from request metadata
   *
   * Provider Detection Strategy:
   * 1. Route-based detection (primary method)
   * 2. Header-based detection (fallback method)
   * 3. Metadata-based detection (decorator method)
   * 4. Pattern matching for dynamic routes
   *
   * Detection Priority:
   * - Route path analysis (most reliable)
   * - X-Webhook-Provider header (explicit)
   * - Decorator metadata (configuration)
   * - Default fallback (unknown)
   *
   * @param request - Express request object
   * @returns Detected webhook provider or null
   *
   * @example
   * ```typescript
   * // Route-based detection:
   * /webhooks/stripe -> WebhookProvider.STRIPE
   * /webhooks/paypal -> WebhookProvider.PAYPAL
   * /integrations/zoom/webhook -> WebhookProvider.ZOOM
   *
   * // Header-based detection:
   * X-Webhook-Provider: stripe -> WebhookProvider.STRIPE
   * ```
   */
  private extractProvider(request: Request): WebhookProvider | null {
    // Primary method: Route-based detection
    const route = request.route?.path || request.path;

    if (route.includes('/stripe')) return WebhookProvider.STRIPE;
    if (route.includes('/paypal')) return WebhookProvider.PAYPAL;
    if (route.includes('/zoom')) return WebhookProvider.ZOOM;
    if (route.includes('/custom')) return WebhookProvider.CUSTOM;

    // Secondary method: Header-based detection
    const providerHeader = request.headers['x-webhook-provider'] as string;
    if (providerHeader) {
      return providerHeader.toLowerCase() as WebhookProvider;
    }

    return null;
  }

  /**
   * Extracts raw request body for signature verification
   *
   * Raw Body Extraction Strategy:
   * 1. Check for pre-captured raw body (middleware)
   * 2. Handle streaming requests (future enhancement)
   * 3. Provide fallback for development scenarios
   * 4. Ensure body is available for signature verification
   *
   * Security Considerations:
   * - Raw body must match exactly what provider signed
   * - JSON parsing modifies body structure
   * - Middleware must capture body before parsing
   * - Streaming requires special handling
   *
   * @param request - Express request object
   * @returns Raw request body as string or null
   *
   * @example
   * ```typescript
   * // Middleware captures raw body:
   * app.use((req, res, next) => {
   *   let rawBody = '';
   *   req.on('data', chunk => rawBody += chunk);
   *   req.on('end', () => (req.rawBody = rawBody));
   *   next();
   * });
   * ```
   */
  private getRawBody(request: Request): string | null {
    // Check if raw body was captured by middleware
    if ((request as any).rawBody) {
      return (request as any).rawBody;
    }

    // For streaming requests, we need to handle this differently
    // This would require middleware to capture the raw body
    return null;
  }

  /**
   * Logs webhook security events with comprehensive metadata
   *
   * Logging Strategy:
   * 1. Capture all relevant security event data
   * 2. Include request metadata for analysis
   * 3. Provide structured logging for monitoring
   * 4. Enable security incident investigation
   * 5. Support compliance and audit requirements
   *
   * Event Data Captured:
   * - Provider and event type
   * - Security validation status
   * - Processing duration
   * - Error details (if any)
   * - Request metadata (IP, user agent, headers)
   *
   * @param logData - Webhook event data to log
   * @returns Promise that resolves when logging is complete
   *
   * @example
   * ```typescript
   * await this.logWebhookEvent({
   *   provider: 'stripe',
   *   eventType: 'payment.succeeded',
   *   status: 'success',
   *   duration: 45,
   *   ipAddress: '192.168.1.1',
   *   userAgent: 'Stripe/1.0'
   * });
   * ```
   */
  private async logWebhookEvent(logData: any): Promise<void> {
    try {
      await this.webhookLoggingService.logWebhookEvent(logData);
    } catch (error) {
      // Log logging failures to prevent security issues
      this.logger.error(`Failed to log webhook event: ${error.message}`);
    }
  }
}

/**
 * Express Request Interface Extension
 *
 * Extends the Express Request interface to include webhook-specific
 * properties that are added by the WebhookAuthGuard after successful
 * security validation.
 *
 * Added Properties:
 * - webhookProvider: The detected webhook provider
 * - webhookPayload: The validated webhook payload
 * - webhookEventId: The unique event ID for replay protection
 *
 * Usage:
 * ```typescript
 * @Post('webhook')
 * @UseGuards(WebhookAuthGuard)
 * async handleWebhook(@Req() request: any) {
 *   // These properties are available after guard execution
 *   const provider = request.webhookProvider;
 *   const payload = request.webhookPayload;
 *   const eventId = request.webhookEventId;
 * }
 * ```
 */
declare global {
  namespace Express {
    interface Request {
      webhookProvider?: WebhookProvider;
      webhookPayload?: any;
      webhookEventId?: string;
    }
  }
}
