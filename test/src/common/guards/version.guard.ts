import { Injectable, CanActivate, ExecutionContext, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { API_VERSION_KEY, DEPRECATED_KEY } from '../decorators/api-version.decorator';

@Injectable()
export class VersionGuard implements CanActivate {
  private readonly logger = new Logger(VersionGuard.name);

  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Get version from multiple sources
    const version = this.getRequestVersion(request);
    const supportedVersions = this.configService.get<string[]>('api.supportedVersions', []);
    const deprecatedVersions = this.configService.get<string[]>('api.deprecatedVersions', []);

    // Check if version is supported
    if (!supportedVersions.includes(version)) {
      throw new BadRequestException({
        message: `Unsupported API version: ${version}`,
        supportedVersions,
        currentVersion: version,
        documentation: 'https://docs.strellerminds.com/api/versions',
      });
    }

    // Check for deprecation
    const isDeprecated = deprecatedVersions.includes(version);
    if (isDeprecated) {
      this.handleDeprecatedVersion(request, version);
    }

    // Set version info in request for later use
    request.apiVersion = version;
    request.isDeprecated = isDeprecated;

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
    const deprecatedConfig = this.configService.get('api.deprecatedVersions', [])
      .find((v: any) => v.version === version);

    if (deprecatedConfig) {
      const warning = {
        message: `API version ${version} is deprecated`,
        deprecatedIn: deprecatedConfig.deprecatedIn,
        removedIn: deprecatedConfig.removedIn,
        migrationGuide: deprecatedConfig.migrationGuide,
        alternative: deprecatedConfig.alternative,
      };

      // Log deprecation usage
      this.logger.warn(`Deprecated API version used: ${version}`, {
        endpoint: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        warning,
      });

      // Add deprecation headers
      request.res?.setHeader('Deprecation', 'true');
      request.res?.setHeader('Sunset', deprecatedConfig.removedIn);
      request.res?.setHeader('Link', `<${deprecatedConfig.migrationGuide}>; rel="deprecation"`);
      request.res?.setHeader('Warning', `299 - "API version ${version} is deprecated. Will be removed in ${deprecatedConfig.removedIn}"`);
    }
  }
}
