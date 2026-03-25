import { Controller, Get, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { WebhookLoggingService } from '../services/webhook-logging.service';
import { WebhookSecurityService } from '../services/webhook-security.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request.types';

@Controller('admin/webhooks')
@UseGuards(JwtAuthGuard)
export class WebhookMonitoringController {
  constructor(
    private readonly webhookLoggingService: WebhookLoggingService,
    private readonly webhookSecurityService: WebhookSecurityService,
  ) {}

  /**
   * Get webhook logs with filtering
   */
  @Get('logs')
  @HttpCode(HttpStatus.OK)
  async getWebhookLogs(
    @Query('provider') provider?: string,
    @Query('eventType') eventType?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters = {
      provider,
      eventType,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    const result = await this.webhookLoggingService.getWebhookLogs(filters);

    return {
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit: filters.limit || 100,
        offset: filters.offset || 0,
      },
    };
  }

  /**
   * Get webhook statistics
   */
  @Get('statistics')
  @HttpCode(HttpStatus.OK)
  async getWebhookStatistics(
    @Query('timeRange') timeRange: 'hour' | 'day' | 'week' | 'month' = 'day',
  ) {
    const stats = await this.webhookLoggingService.getWebhookStatistics(timeRange);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get webhook error patterns
   */
  @Get('errors')
  @HttpCode(HttpStatus.OK)
  async getErrorPatterns(@Query('limit') limit?: string) {
    const patterns = await this.webhookLoggingService.getErrorPatterns(
      limit ? parseInt(limit, 10) : 10,
    );

    return {
      success: true,
      data: patterns,
    };
  }

  /**
   * Get webhook health status
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  async getWebhookHealth() {
    const health = await this.webhookLoggingService.monitorWebhookHealth();

    return {
      success: true,
      data: health,
    };
  }

  /**
   * Get webhook provider configurations
   */
  @Get('providers')
  @HttpCode(HttpStatus.OK)
  async getWebhookProviders(@CurrentUser() user: RequestUser) {
    const providers = [
      {
        provider: 'stripe',
        name: 'Stripe',
        enabled: !!process.env.STRIPE_WEBHOOK_SECRET,
        endpoints: ['/webhooks/stripe'],
        securityFeatures: {
          signatureValidation: true,
          replayProtection: true,
          rateLimiting: true,
          logging: true,
        },
      },
      {
        provider: 'paypal',
        name: 'PayPal',
        enabled: !!process.env.PAYPAL_WEBHOOK_SECRET,
        endpoints: ['/webhooks/paypal'],
        securityFeatures: {
          signatureValidation: true,
          replayProtection: true,
          rateLimiting: true,
          logging: true,
        },
      },
      {
        provider: 'zoom',
        name: 'Zoom',
        enabled: !!process.env.ZOOM_WEBHOOK_SECRET,
        endpoints: ['/integrations/zoom/webhook'],
        securityFeatures: {
          signatureValidation: true,
          replayProtection: true,
          rateLimiting: true,
          logging: true,
        },
      },
      {
        provider: 'custom',
        name: 'Custom Webhooks',
        enabled: !!process.env.CUSTOM_WEBHOOK_SECRET,
        endpoints: ['/webhooks/custom'],
        securityFeatures: {
          signatureValidation: true,
          replayProtection: true,
          rateLimiting: true,
          logging: true,
        },
      },
    ];

    return {
      success: true,
      data: providers,
    };
  }

  /**
   * Clean up old webhook logs
   */
  @Get('cleanup')
  @HttpCode(HttpStatus.OK)
  async cleanupWebhookLogs(@Query('retentionDays') retentionDays?: string) {
    const deletedCount = await this.webhookLoggingService.cleanupOldLogs(
      retentionDays ? parseInt(retentionDays, 10) : 30,
    );

    return {
      success: true,
      data: {
        deletedCount,
        message: `Cleaned up ${deletedCount} old webhook log entries`,
      },
    };
  }

  /**
   * Test webhook security configuration
   */
  @Get('test-security')
  @HttpCode(HttpStatus.OK)
  async testWebhookSecurity(@Query('provider') provider: string) {
    const providerConfig = this.webhookSecurityService.getProviderConfig(provider as any);

    if (!providerConfig) {
      return {
        success: false,
        error: `Provider ${provider} not found or not configured`,
      };
    }

    const securityTest = {
      provider,
      configured: true,
      enabled: providerConfig.enabled,
      signatureValidation: {
        configured: !!providerConfig.security.signature.secret,
        algorithm: providerConfig.security.signature.algorithm,
        headerName: providerConfig.security.signature.headerName,
      },
      rateLimiting: {
        configured: !!providerConfig.security.rateLimit,
        maxRequests: providerConfig.security.rateLimit.maxRequests,
        windowMs: providerConfig.security.rateLimit.windowMs,
      },
      replayProtection: {
        enabled: providerConfig.security.replayProtection.enabled,
        windowMs: providerConfig.security.replayProtection.windowMs,
      },
      logging: {
        enabled: providerConfig.security.logging.enabled,
        includePayload: providerConfig.security.logging.includePayload,
        includeHeaders: providerConfig.security.logging.includeHeaders,
        retentionDays: providerConfig.security.logging.retentionDays,
      },
    };

    return {
      success: true,
      data: securityTest,
    };
  }
}
