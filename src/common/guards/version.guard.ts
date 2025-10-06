import { Injectable, CanActivate, ExecutionContext, BadRequestException, Logger, GoneException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { API_VERSION_KEY, DEPRECATED_KEY } from '../decorators/api-version.decorator';
import { SimplifiedDeprecationService } from '../services/simplified-deprecation.service';

@Injectable()
export class VersionGuard implements CanActivate {
  private readonly logger = new Logger(VersionGuard.name);

  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
    private deprecationService: SimplifiedDeprecationService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Get version from multiple sources
    const version = this.getRequestVersion(request);
    const supportedVersions = this.configService.get<string[]>('api.supportedVersions', []);

    // Check if version is supported
    if (!supportedVersions.includes(version)) {
      throw new BadRequestException({
        message: `Unsupported API version: ${version}`,
        supportedVersions,
        currentVersion: version,
        documentation: 'https://docs.strellerminds.com/api/versions',
      });
    }

    // Check for deprecation and sunset
    const isDeprecated = this.deprecationService.isDeprecated(version);
    const isPastSunset = this.deprecationService.isPastSunset(version);
    const sunsetEnforcement = this.configService.get('api.sunsetEnforcement', { enabled: true });

    if (isPastSunset && sunsetEnforcement.enabled) {
      this.handleSunsetViolation(request, version);
    } else if (isDeprecated) {
      this.handleDeprecatedVersion(request, version);
    }

    // Set version info in request for later use
    request.apiVersion = version;
    request.isDeprecated = isDeprecated;
    request.isPastSunset = isPastSunset;

    return true;
  }

  private getRequestVersion(request: any): string {
    // Priority order: header, query param, default
    return (
      request.headers['api-version'] ||
      request.headers['accept-version'] ||
      request.query.version ||
      request.params.version ||
      this.configService.get('api.defaultVersion', 'v1')
    );
  }

  private handleDeprecatedVersion(request: any, version: string): void {
    const deprecationInfo = this.deprecationService.getDeprecationInfo(version);
    if (!deprecationInfo) return;

    const warning = this.deprecationService.generateWarning(version);
    const daysUntilSunset = this.deprecationService.getDaysUntilSunset(version);

    // Log deprecation usage
    this.deprecationService.logDeprecationUsage(
      version,
      `${request.method} ${request.route?.path || request.url}`,
      request.headers['user-agent']
    );

    // Add deprecation headers
    if (request.res) {
      request.res.setHeader('Deprecation', 'true');
      request.res.setHeader('Sunset', deprecationInfo.sunsetDate);
      request.res.setHeader('Link', `<${deprecationInfo.migrationGuide}>; rel="deprecation"`);
      
      if (warning) {
        request.res.setHeader('Warning', `299 - "${warning.message}"`);
      }
    }
  }

  private handleSunsetViolation(request: any, version: string): void {
    const deprecationInfo = this.deprecationService.getDeprecationInfo(version);
    if (!deprecationInfo) return;

    const sunsetEnforcement = this.configService.get('api.sunsetEnforcement', {});
    const responseType = sunsetEnforcement.responseAfterSunset || 'gone';

    // Log sunset violation
    this.logger.error(`Sunset violation: API version ${version} accessed after sunset date`, {
      version,
      sunsetDate: deprecationInfo.sunsetDate,
      endpoint: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });

    if (responseType === 'gone') {
      throw new GoneException({
        message: `API version ${version} has been removed as of ${deprecationInfo.sunsetDate}`,
        sunsetDate: deprecationInfo.sunsetDate,
        migrationGuide: deprecationInfo.migrationGuide,
        alternative: deprecationInfo.alternative,
      });
    }
  }
}
