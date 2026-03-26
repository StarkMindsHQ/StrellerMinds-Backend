export enum ApiVersion {
  V1 = 'v1',
  V2 = 'v2',
  V3 = 'v3',
}

export const API_VERSIONS = {
  [ApiVersion.V1]: {
    deprecated: false,
    deprecationDate: null,
    removalDate: null,
  },
  [ApiVersion.V2]: {
    deprecated: false,
    deprecationDate: null,
    removalDate: null,
  },
  [ApiVersion.V3]: {
    deprecated: false,
    deprecationDate: null,
    removalDate: null,
  },
};

export interface ApiVersionInfo {
  version: ApiVersion;
  deprecated: boolean;
  deprecationDate?: Date;
  removalDate?: Date;
  migrationPath?: string;
}
