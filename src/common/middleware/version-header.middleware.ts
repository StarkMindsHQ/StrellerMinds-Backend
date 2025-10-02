import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VersionHeaderMiddleware implements NestMiddleware {
  private readonly logger = new Logger(VersionHeaderMiddleware.name);

  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Extract version from multiple sources
    const version = this.extractVersion(req);
    const defaultVersion = this.configService.get('api.defaultVersion', 'v1');
    const supportedVersions = this.configService.get('api.supportedVersions', ['v1', 'v2']);

    // Set version in request headers
    req.headers['api-version'] = version;

    // Set response headers
    res.setHeader('API-Version', version);
    res.setHeader('Supported-Versions', supportedVersions.join(', '));
    res.setHeader('Default-Version', defaultVersion);

    // Add deprecation headers if needed
    this.addDeprecationHeaders(req, res, version);

    next();
  }

  private extractVersion(req: Request): string {
    // Priority order for version detection
    const versionSources = [
      req.headers['api-version'],
      req.headers['accept-version'],
      req.headers['x-api-version'],
      req.query.version,
      req.params.version,
    ];

    for (const source of versionSources) {
      if (source && typeof source === 'string') {
        return source.toLowerCase();
      }
    }

    return this.configService.get('api.defaultVersion', 'v1');
  }

  private addDeprecationHeaders(req: Request, res: Response, version: string): void {
    const deprecatedVersions = this.configService.get('api.deprecatedVersions', []);
    const deprecatedVersion = deprecatedVersions.find((v: any) => v.version === version);

    if (deprecatedVersion) {
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', deprecatedVersion.removedIn);
      res.setHeader('Link', `<${deprecatedVersion.migrationGuide}>; rel="deprecation"`);
      res.setHeader(
        'Warning',
        `299 - "API version ${version} is deprecated. Will be removed in ${deprecatedVersion.removedIn}"`,
      );

      // Log deprecation usage
      this.logger.warn(`Deprecated API version accessed: ${version}`, {
        endpoint: req.url,
        method: req.method,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });
    }
  }
}
