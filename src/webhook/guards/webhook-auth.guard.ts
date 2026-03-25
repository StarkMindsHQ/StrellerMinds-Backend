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

@Injectable()
export class WebhookAuthGuard implements CanActivate {
  private readonly logger = new Logger(WebhookAuthGuard.name);

  constructor(
    private readonly webhookSecurityService: WebhookSecurityService,
    private readonly webhookLoggingService: WebhookLoggingService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    try {
      // Get provider from metadata or route
      const provider = this.extractProvider(request);
      if (!provider) {
        throw new BadRequestException('Webhook provider not specified');
      }

      // Get provider configuration
      const providerConfig = this.webhookSecurityService.getProviderConfig(provider);
      if (!providerConfig || !providerConfig.enabled) {
        throw new UnauthorizedException(`Webhook provider ${provider} is not enabled`);
      }

      // Extract request data
      const payload = request.body;
      const headers = request.headers as Record<string, string>;
      const signature = headers[providerConfig.security.signature.headerName];
      const timestamp = headers[providerConfig.security.signature.timestampHeader || ''];

      if (!signature) {
        throw new UnauthorizedException('Missing webhook signature');
      }

      // Get raw body for signature verification
      const rawBody = this.getRawBody(request);
      if (!rawBody) {
        throw new BadRequestException('Raw body is required for signature verification');
      }

      // Validate signature
      const signatureResult = await this.webhookSecurityService.validateSignature(
        rawBody,
        signature,
        timestamp,
        providerConfig.security,
      );

      if (!signatureResult.isValid) {
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

      // Check replay protection
      const eventId = this.webhookSecurityService.extractEventId(payload, provider);
      if (eventId) {
        const replayResult = this.webhookSecurityService.checkReplayProtection(
          eventId,
          providerConfig.security,
        );

        if (!replayResult.isValid) {
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

      // Check rate limiting
      const clientIp = this.webhookSecurityService.getClientIp(request);
      const rateLimitResult = this.webhookSecurityService.checkRateLimit(
        `${provider}:${clientIp}`,
        providerConfig.security,
      );

      if (!rateLimitResult.isValid) {
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

      // Attach validated data to request
      request.webhookProvider = provider;
      request.webhookPayload = payload;
      request.webhookEventId = eventId;

      // Log successful validation
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
      const duration = Date.now() - startTime;

      // Log the failure
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
   * Extract webhook provider from request
   */
  private extractProvider(request: Request): WebhookProvider | null {
    // Try to get provider from route
    const route = request.route?.path || request.path;

    if (route.includes('/stripe')) return WebhookProvider.STRIPE;
    if (route.includes('/paypal')) return WebhookProvider.PAYPAL;
    if (route.includes('/zoom')) return WebhookProvider.ZOOM;
    if (route.includes('/custom')) return WebhookProvider.CUSTOM;

    // Try to get provider from header
    const providerHeader = request.headers['x-webhook-provider'] as string;
    if (providerHeader) {
      return providerHeader.toLowerCase() as WebhookProvider;
    }

    return null;
  }

  /**
   * Get raw body from request
   */
  private getRawBody(request: Request): string | null {
    // For NestJS with raw body middleware
    if ((request as any).rawBody) {
      return (request as any).rawBody;
    }

    // For streaming requests, we need to handle this differently
    // This would require middleware to capture the raw body
    return null;
  }

  /**
   * Log webhook event (helper method)
   */
  private async logWebhookEvent(logData: any): Promise<void> {
    try {
      await this.webhookLoggingService.logWebhookEvent(logData);
    } catch (error) {
      this.logger.error(`Failed to log webhook event: ${error.message}`);
    }
  }
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      webhookProvider?: WebhookProvider;
      webhookPayload?: any;
      webhookEventId?: string;
    }
  }
}
