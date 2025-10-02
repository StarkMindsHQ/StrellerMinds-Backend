export const apiVersionConfig = {
  defaultVersion: 'v1',
  supportedVersions: ['v1', 'v2'],
  deprecatedVersions: [
    {
      version: 'v1',
      deprecatedIn: '2024-01-01',
      removedIn: '2024-12-31',
      migrationGuide: 'https://docs.strellerminds.com/api/migration/v1-to-v2',
      alternative: 'v2',
      reason: 'Enhanced features and improved performance',
    },
  ],
  versioningStrategy: {
    type: 'uri', // uri, header, custom
    prefix: 'api',
    defaultVersion: 'v1',
    supportedVersions: ['v1', 'v2'],
    deprecatedVersions: ['v1'],
  },
  documentation: {
    versions: {
      v1: {
        status: 'deprecated',
        deprecatedIn: '2024-01-01',
        removedIn: '2024-12-31',
        migrationGuide: 'https://docs.strellerminds.com/api/migration/v1-to-v2',
      },
      v2: {
        status: 'current',
        releasedIn: '2024-01-01',
        features: [
          'Enhanced authentication',
          'Improved course management',
          'Better error handling',
        ],
      },
    },
  },
  backwardCompatibility: {
    enabled: true,
    gracePeriod: 30, // days
    deprecatedEndpointBehavior: 'warn', // warn, error, redirect
  },
  analytics: {
    enabled: true,
    trackUsage: true,
    trackDeprecatedUsage: true,
    retentionDays: 90,
  },
};
