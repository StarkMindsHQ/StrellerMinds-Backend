import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DeprecationWarningMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const version = req.headers['api-version'] as string;
    const deprecatedVersions = this.configService.get<any[]>('api.deprecatedVersions', []);

    const deprecatedVersion = deprecatedVersions.find((v) => v.version === version);

    if (deprecatedVersion) {
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', deprecatedVersion.removedIn);
      res.setHeader('Link', `<${deprecatedVersion.migrationGuide}>; rel="deprecation"`);
      res.setHeader(
        'Warning',
        `299 - "API version ${version} is deprecated. Will be removed in ${deprecatedVersion.removedIn}"`,
      );
    }

    next();
  }
}
