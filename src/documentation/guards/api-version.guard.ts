import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  GoneException,
  Logger,
} from '@nestjs/common';
import { ApiVersioningService } from '../services/api-versioning.service';
import { VersionStatus } from '../entities/api-version.entity';

@Injectable()
export class ApiVersionGuard implements CanActivate {
  private readonly logger = new Logger(ApiVersionGuard.name);

  constructor(private versioningService: ApiVersioningService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const headerVersion = (request.headers['x-api-version'] || request.headers['api-version'] || '')
      .toString()
      .trim();

    let version = headerVersion || '';

    if (!version) {
      const uriMatch = request.url?.match(/\/v(\d+(?:\.\d+)?)(?=\/|$)/i);
      if (uriMatch) {
        version = `v${uriMatch[1]}`;
      }
    }

    if (!version) {
      version = 'v1';
    }

    if (!version.startsWith('v')) {
      version = `v${version}`;
    }

    const versionEntity = await this.versioningService.getVersionByName(version);

    if (!versionEntity) {
      this.logger.warn(`Unsupported API version requested: ${version}`);
      throw new BadRequestException(`Unsupported API version: ${version}`);
    }

    if (
      versionEntity.status === VersionStatus.DEPRECATED ||
      versionEntity.status === VersionStatus.SUNSET
    ) {
      this.logger.warn(`Deprecated or sunset API version accessed: ${version}`);
      throw new GoneException(
        `API version ${version} is ${versionEntity.status}. Migrate to current version.
` + `See /api/v1/documentation/versions for version details.`,
      );
    }

    // Attach version metadata for analytics and endpoint tracking
    request.apiVersion = version;
    response.setHeader('X-API-Version', version);
    response.setHeader('X-API-Version-Status', versionEntity.status);
    if (versionEntity.deprecationDate) {
      response.setHeader(
        'X-API-Version-Deprecated-At',
        versionEntity.deprecationDate.toISOString(),
      );
    }
    if (versionEntity.sunsetDate) {
      response.setHeader('X-API-Version-Sunset-At', versionEntity.sunsetDate.toISOString());
    }

    return true;
  }
}
