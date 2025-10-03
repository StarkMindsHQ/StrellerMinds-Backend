export const apiVersionConfig = {
  // Current API version configuration
  defaultVersion: 'v2',
  currentVersion: 'v2',
  supportedVersions: ['v1', 'v2'],
  
  // Simplified deprecation configuration
  deprecatedVersions: {
    v1: {
      deprecatedIn: '2024-01-01',
      sunsetDate: '2024-12-31',
      migrationGuide: 'https://docs.strellerminds.com/api/migration/v1-to-v2',
      alternative: 'v2',
      reason: 'Enhanced features and improved performance',
      endpoints: [
        {
          path: '/auth/login',
          method: 'POST',
          breakingChange: 'username field renamed to email'
        },
        {
          path: '/auth/register',
          method: 'POST',
          breakingChange: 'username field renamed to email'
        },
        {
          path: '/courses',
          method: 'GET',
          breakingChange: 'response structure changed, new query parameters'
        },
        {
          path: '/courses/:id',
          method: 'GET',
          breakingChange: 'enhanced response with additional metadata'
        },
        {
          path: '/courses',
          method: 'POST',
          breakingChange: 'enhanced request validation and response'
        }
      ]
    }
  },
  
  // Versioning strategy
  versioningStrategy: {
    type: 'uri',
    prefix: 'api',
    headerNames: ['api-version', 'accept-version', 'x-api-version'],
    queryParam: 'version'
  },
  
  // Sunset enforcement
  sunsetEnforcement: {
    enabled: true,
    warningPeriodDays: 90, // Start showing warnings 90 days before sunset
    gracePeriodDays: 30,   // 30 days grace period after sunset
    responseAfterSunset: 'gone' // 'gone', 'redirect', 'error'
  },
  
  // Simplified analytics
  analytics: {
    enabled: true,
    trackDeprecatedUsage: true,
    logLevel: 'warn' // 'info', 'warn', 'error'
  }
};

