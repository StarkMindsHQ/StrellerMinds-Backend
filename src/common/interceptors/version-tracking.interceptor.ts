import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { API_VERSION_KEY, DEPRECATED_KEY } from '../decorators/api-version.decorator';
import { VersionAnalyticsService } from '../services/version-analytics.service';

@Injectable()
export class VersionTrackingInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private versionAnalytics: VersionAnalyticsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    const version =
      this.reflector.getAllAndOverride<string>(API_VERSION_KEY, [handler, controller]) ||
      request.headers['api-version'] ||
      'v1';

    const deprecationInfo = this.reflector.getAllAndOverride(DEPRECATED_KEY, [handler, controller]);

    request.apiVersion = version;
    request.deprecationInfo = deprecationInfo;

    return next.handle().pipe(
      tap(() => {
        this.versionAnalytics.trackApiUsage({
          version,
          endpoint: `${request.method} ${request.route?.path || request.url}`,
          userAgent: request.headers['user-agent'],
          timestamp: new Date(),
          deprecated: !!deprecationInfo,
        });
      }),
    );
  }
}
