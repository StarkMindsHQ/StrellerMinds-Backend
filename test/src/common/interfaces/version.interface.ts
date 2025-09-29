export interface VersionInfo {
  version: string;
  deprecated?: boolean;
  deprecatedIn?: string;
  removedIn?: string;
  migrationGuide?: string;
}

export interface ApiVersionConfig {
  defaultVersion: string;
  supportedVersions: string[];
  deprecatedVersions: DeprecatedVersion[];
}

export interface DeprecatedVersion {
  version: string;
  deprecatedIn: string;
  removedIn: string;
  migrationGuide: string;
}
