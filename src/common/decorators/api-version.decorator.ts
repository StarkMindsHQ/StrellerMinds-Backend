import { SetMetadata } from '@nestjs/common';

export const API_VERSION_KEY = 'apiVersion';
export const DEPRECATED_KEY = 'deprecated';
export const DEPRECATION_INFO_KEY = 'deprecationInfo';

export const ApiVersion = (version: string) => SetMetadata(API_VERSION_KEY, version);

export const Deprecated = (deprecatedIn: string, removedIn: string, migrationGuide?: string) =>
  SetMetadata(DEPRECATED_KEY, {
    deprecatedIn,
    removedIn,
    migrationGuide,
    message: `This endpoint is deprecated since ${deprecatedIn} and will be removed in ${removedIn}`,
  });

export const DeprecationInfo = (info: {
  deprecatedIn: string;
  removedIn: string;
  migrationGuide?: string;
  alternative?: string;
  reason?: string;
}) => SetMetadata(DEPRECATION_INFO_KEY, info);
