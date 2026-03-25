import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request } from 'express';
import { WebhookLoggingService } from '../services/webhook-logging.service';
import { WebhookProvider } from '../interfaces/webhook.interfaces';

@Injectable()
export class WebhookLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(WebhookLoggingInterceptor.name);

  constructor(private readonly webhookLoggingService: WebhookLoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    // Only process webhook requests
    if (!this.isWebhookRequest(request)) {
      return next.handle();
    }

    const provider = request.webhookProvider || this.extractProviderFromRoute(request);
    const eventType = request.webhookPayload?.type || 'unknown';

    return next.handle().pipe(
      tap(() => {
        // Log successful processing
        this.logWebhookCompletion(request, provider, eventType, 'success', startTime);
      }),
      catchError((error) => {
        // Log failed processing
        this.logWebhookCompletion(request, provider, eventType, 'failed', startTime, error.message);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Check if request is a webhook request
   */
  private isWebhookRequest(request: Request): boolean {
    return !!(
      request.webhookProvider ||
      request.route?.path?.includes('webhook') ||
      request.path?.includes('webhook')
    );
  }

  /**
   * Extract provider from route path
   */
  private extractProviderFromRoute(request: Request): WebhookProvider | null {
    const route = request.route?.path || request.path || '';

    if (route.includes('/stripe')) return 'stripe' as WebhookProvider;
    if (route.includes('/paypal')) return 'paypal' as WebhookProvider;
    if (route.includes('/zoom')) return 'zoom' as WebhookProvider;
    if (route.includes('/custom')) return 'custom' as WebhookProvider;

    return null;
  }

  /**
   * Log webhook completion
   */
  private async logWebhookCompletion(
    request: Request,
    provider: WebhookProvider | null,
    eventType: string,
    status: 'success' | 'failed',
    startTime: number,
    errorMessage?: string,
  ): Promise<void> {
    try {
      const duration = Date.now() - startTime;

      await this.webhookLoggingService.logWebhookEvent({
        provider: provider || 'unknown',
        eventType,
        status,
        duration,
        error: errorMessage,
        headers: this.sanitizeHeaders(request.headers as Record<string, string>),
        ipAddress: this.getClientIp(request),
        userAgent: request.headers['user-agent'] || 'unknown',
      });
    } catch (error) {
      this.logger.error(`Failed to log webhook completion: ${error.message}`);
    }
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      (request as any).connection?.remoteAddress ||
      (request as any).socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };

    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'stripe-signature',
      'x-zm-signature',
      'paypal-auth-algo',
      'x-signature',
      'cookie',
    ];

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
