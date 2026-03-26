import { SetMetadata } from '@nestjs/common';
import { ApiVersion } from '../enums/api-version.enum';

export const API_VERSION_METADATA_KEY = 'api_version';

/**
 * Decorator to mark endpoints with API version information
 * @param version The API version this endpoint supports
 * @param deprecated Whether this endpoint is deprecated
 * @param deprecationDate When this endpoint will be deprecated
 * @param migrationPath Path to migrate to for deprecated endpoints
 */
export const ApiVersioned = (
  version: ApiVersion,
  deprecated: boolean = false,
  deprecationDate?: Date,
  migrationPath?: string
) => {
  return SetMetadata(API_VERSION_METADATA_KEY, {
    version,
    deprecated,
    deprecationDate,
    migrationPath,
  });
};

/**
 * Decorator to mark endpoints as deprecated with migration information
 */
export const ApiDeprecated = (
  deprecationDate: Date,
  migrationPath: string,
  removalDate?: Date
) => {
  return SetMetadata(API_VERSION_METADATA_KEY, {
    version: ApiVersion.V1, // Default to current version
    deprecated: true,
    deprecationDate,
    migrationPath,
    removalDate,
  });
};
