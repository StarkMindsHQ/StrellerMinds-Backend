import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyService } from '../services/api-key.service';
import { ApiAnalyticsService } from '../services/api-analytics.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private apiKeyService: ApiKeyService,
    private analyticsService: ApiAnalyticsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    const key = await this.apiKeyService.validateApiKey(apiKey);
    if (!key) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Check rate limit
    const withinLimit = await this.apiKeyService.checkRateLimit(key);
    if (!withinLimit) {
      throw new UnauthorizedException('Rate limit exceeded');
    }

    // Check IP restrictions
    if (key.allowedIps && key.allowedIps.length > 0) {
      const clientIp = request.ip || request.connection.remoteAddress;
      if (!key.allowedIps.includes(clientIp)) {
        throw new UnauthorizedException('IP address not allowed');
      }
    }

    // Attach API key to request
    request.apiKey = key;

    // Track usage asynchronously
    const startTime = Date.now();
    const originalSend = request.res.send;
    request.res.send = function (body: any) {
      const responseTime = Date.now() - startTime;
      const statusCode = request.res.statusCode;

      // Track usage (don't await to avoid blocking response)
      setImmediate(() => {
        request.analyticsService?.trackUsage(
          key.id,
          request.path,
          request.method,
          statusCode,
          responseTime,
          {
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            queryParams: request.query,
            requestHeaders: request.headers,
          },
        ).catch(() => {
          // Ignore tracking errors
        });
      });

      return originalSend.call(this, body);
    };

    // Attach analytics service to request for tracking
    request.analyticsService = this.analyticsService;

    return true;
  }
}
