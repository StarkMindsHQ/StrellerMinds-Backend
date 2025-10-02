# API Versioning Implementation

## Overview

This document describes the comprehensive API versioning strategy implemented for the StrellerMinds-Backend. The implementation provides URI-based versioning, backward compatibility, deprecation management, and versioned documentation.

## Architecture

### Core Components

1. **Version Management**
   - `ApiVersioningService`: Central service for version management
   - `VersionGuard`: Validates API versions and handles deprecation
   - `VersionHeaderMiddleware`: Extracts version from headers and query params

2. **Backward Compatibility**
   - `BackwardCompatibilityService`: Handles request/response transformations
   - Compatibility rules for smooth version transitions
   - Breaking change detection and validation

3. **Deprecation Management**
   - `ApiDeprecationService`: Manages deprecation lifecycle
   - Scheduled deprecation notifications
   - Deprecation analytics and reporting

4. **Documentation**
   - `ApiDocumentationService`: Versioned API documentation
   - OpenAPI specification generation
   - Migration guides and changelogs

## Implementation Details

### 1. URI-Based Versioning

The API uses URI-based versioning with the pattern `/api/{version}/...`:

```
/api/v1/auth/login    # Deprecated v1 endpoint
/api/v2/auth/login    # Current v2 endpoint
```

### 2. Version Detection

Versions can be specified through multiple methods (in order of priority):

1. **Headers**: `api-version`, `accept-version`, `x-api-version`
2. **Query Parameters**: `?version=v2`
3. **Path Parameters**: `/api/v2/...`
4. **Default**: Falls back to configured default version

### 3. Configuration

The versioning strategy is configured in `src/config/api-version.config.ts`:

```typescript
export const apiVersionConfig = {
  defaultVersion: 'v1',
  supportedVersions: ['v1', 'v2'],
  deprecatedVersions: ['v1'],
  versioningStrategy: {
    type: 'uri',
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
        features: ['Enhanced authentication', 'Improved course management'],
      },
    },
  },
  backwardCompatibility: {
    enabled: true,
    gracePeriod: 30,
    deprecatedEndpointBehavior: 'warn',
  },
  analytics: {
    enabled: true,
    trackUsage: true,
    trackDeprecatedUsage: true,
    retentionDays: 90,
  },
};
```

### 4. Backward Compatibility Layer

The backward compatibility service provides:

- **Request Transformation**: Converts old format requests to new format
- **Response Transformation**: Converts new format responses to old format
- **Compatibility Rules**: Configurable rules for version transitions
- **Breaking Change Detection**: Identifies and reports breaking changes

Example compatibility rule:

```typescript
{
  fromVersion: 'v1',
  toVersion: 'v2',
  endpoint: '/auth/login',
  method: 'POST',
  transformation: (data: any) => {
    // Transform v1 login request to v2 format
    if (data.username) {
      return {
        ...data,
        email: data.username,
        username: undefined,
      };
    }
    return data;
  },
  reverseTransformation: (data: any) => {
    // Transform v2 login response to v1 format
    return {
      ...data,
      user: data.user ? {
        ...data.user,
        username: data.user.email,
      } : undefined,
    };
  },
}
```

### 5. Deprecation Strategy

The deprecation service manages:

- **Deprecation Scheduling**: Schedule endpoints for deprecation
- **Notification System**: Automatic notifications to API consumers
- **Analytics**: Track usage of deprecated endpoints
- **Timeline Management**: Manage deprecation and removal dates

Example deprecation schedule:

```typescript
{
  version: 'v1',
  endpoint: '/auth/login',
  method: 'POST',
  deprecatedIn: '2024-01-01',
  removedIn: '2024-12-31',
  migrationGuide: 'https://docs.strellerminds.com/api/migration/v1-to-v2',
  alternative: '/api/v2/auth/login',
  reason: 'Enhanced authentication with improved security',
  impact: 'medium',
}
```

### 6. Versioned Documentation

The documentation service provides:

- **Version-Specific Documentation**: Complete API docs for each version
- **OpenAPI Generation**: Generate OpenAPI specs for each version
- **Migration Guides**: Step-by-step migration instructions
- **Changelogs**: Track changes between versions

## API Endpoints

### Version Management

```
GET /version/info                    # Get version information
GET /version/analytics               # Get version usage analytics
GET /version/migration               # Get migration recommendations
GET /version/compatibility/:old/:new # Check backward compatibility
GET /version/documentation/:version  # Get versioned documentation
GET /version/status                  # Get API version status
```

### Documentation

```
GET /documentation/versions                    # Get available versions
GET /documentation/:version                    # Get documentation for version
GET /documentation/:version/openapi            # Get OpenAPI spec for version
GET /documentation/:version/changelog          # Get changelog for version
GET /documentation/migration/:from/:to         # Get migration guide
GET /documentation/report                      # Generate documentation report
GET /documentation/compare/:v1/:v2            # Compare two versions
```

## Usage Examples

### 1. Making API Calls

```bash
# Using headers
curl -H "api-version: v2" https://api.strellerminds.com/auth/login

# Using query parameters
curl https://api.strellerminds.com/auth/login?version=v2

# Using URI versioning
curl https://api.strellerminds.com/api/v2/auth/login
```

### 2. Version Information

```bash
# Get current version info
curl https://api.strellerminds.com/version/info

# Response:
{
  "current": "v2",
  "supported": ["v1", "v2"],
  "deprecated": [
    {
      "version": "v1",
      "deprecatedIn": "2024-01-01",
      "removedIn": "2024-12-31",
      "migrationGuide": "https://docs.strellerminds.com/api/migration/v1-to-v2",
      "alternative": "v2",
      "reason": "Enhanced features and improved performance"
    }
  ]
}
```

### 3. Migration Guide

```bash
# Get migration guide from v1 to v2
curl https://api.strellerminds.com/documentation/migration/v1/v2

# Response:
{
  "fromVersion": "v1",
  "toVersion": "v2",
  "title": "Migration from v1 to v2",
  "description": "Complete guide for migrating from API v1 to v2",
  "breakingChanges": [
    {
      "endpoint": "/auth/login",
      "method": "POST",
      "change": "Username field renamed to email",
      "impact": "medium",
      "migration": "Replace username field with email in login requests"
    }
  ],
  "migrationSteps": [
    {
      "step": 1,
      "title": "Update authentication",
      "description": "Replace username field with email in login requests",
      "code": "// Before\n{\n  \"username\": \"user@example.com\",\n  \"password\": \"password123\"\n}\n\n// After\n{\n  \"email\": \"user@example.com\",\n  \"password\": \"password123\"\n}"
    }
  ]
}
```

## Deprecation Headers

When using deprecated endpoints, the API returns deprecation headers:

```
Deprecation: true
Sunset: 2024-12-31
Link: <https://docs.strellerminds.com/api/migration/v1-to-v2>; rel="deprecation"
Warning: 299 - "API version v1 is deprecated. Will be removed in 2024-12-31"
```

## Analytics and Monitoring

### Usage Tracking

The system tracks API usage by version:

```bash
# Get version usage analytics
curl https://api.strellerminds.com/version/analytics

# Response:
{
  "versionUsage": [
    {
      "version": "v2",
      "totalUsage": 1500,
      "deprecatedUsage": 0,
      "percentage": 75.5
    },
    {
      "version": "v1",
      "totalUsage": 500,
      "deprecatedUsage": 500,
      "percentage": 24.5
    }
  ],
  "deprecatedEndpoints": [
    {
      "endpoint": "GET /api/v1/courses",
      "version": "v1",
      "usage_count": 25
    }
  ]
}
```

### Deprecation Analytics

```bash
# Get deprecation analytics
curl https://api.strellerminds.com/version/migration

# Response:
{
  "deprecatedEndpoints": [
    {
      "endpoint": "GET /api/v1/courses",
      "version": "v1",
      "usage_count": 25
    }
  ],
  "migrationGuides": [
    {
      "from": "v1",
      "to": "v2",
      "guide": "https://docs.strellerminds.com/api/migration/v1-to-v2",
      "deadline": "2024-12-31",
      "usageCount": 150
    }
  ]
}
```

## Best Practices

### 1. Version Management

- **Semantic Versioning**: Use semantic versioning for API versions
- **Gradual Migration**: Provide migration periods for breaking changes
- **Clear Communication**: Communicate deprecation timelines clearly
- **Documentation**: Maintain comprehensive migration guides

### 2. Backward Compatibility

- **Transformations**: Use request/response transformations for smooth transitions
- **Grace Periods**: Provide adequate grace periods for migrations
- **Testing**: Thoroughly test backward compatibility
- **Monitoring**: Monitor usage of deprecated endpoints

### 3. Documentation

- **Version-Specific Docs**: Maintain separate documentation for each version
- **Migration Guides**: Provide step-by-step migration instructions
- **Examples**: Include code examples for each version
- **Changelogs**: Track all changes between versions

### 4. Monitoring and Analytics

- **Usage Tracking**: Track API usage by version
- **Deprecation Monitoring**: Monitor usage of deprecated endpoints
- **Performance Metrics**: Track performance by version
- **Error Monitoring**: Monitor errors by version

## Migration Strategy

### Phase 1: Preparation (Months 1-2)

1. **Announce New Version**: Communicate upcoming v2 release
2. **Documentation**: Prepare comprehensive migration guides
3. **Testing**: Test backward compatibility thoroughly
4. **Monitoring**: Set up analytics and monitoring

### Phase 2: Release (Month 3)

1. **Release v2**: Deploy v2 API with backward compatibility
2. **Documentation**: Publish v2 documentation and migration guides
3. **Support**: Provide support for migration questions
4. **Monitoring**: Monitor adoption and usage patterns

### Phase 3: Deprecation (Months 4-6)

1. **Deprecation Notices**: Send deprecation notifications
2. **Migration Support**: Provide migration assistance
3. **Analytics**: Track migration progress
4. **Communication**: Regular updates on migration status

### Phase 4: Removal (Month 7)

1. **Final Notices**: Send final removal notifications
2. **Grace Period**: Provide final grace period
3. **Removal**: Remove deprecated endpoints
4. **Documentation**: Update documentation to reflect removal

## Security Considerations

1. **Version Validation**: Validate API versions to prevent unauthorized access
2. **Rate Limiting**: Apply rate limiting per version
3. **Authentication**: Ensure authentication works across versions
4. **Audit Logging**: Log version usage for security monitoring

## Performance Considerations

1. **Caching**: Cache version-specific responses
2. **Transformation Overhead**: Minimize transformation overhead
3. **Monitoring**: Monitor performance by version
4. **Optimization**: Optimize frequently used transformations

## Testing Strategy

1. **Unit Tests**: Test version-specific functionality
2. **Integration Tests**: Test backward compatibility
3. **Load Tests**: Test performance with version transformations
4. **Migration Tests**: Test migration scenarios

## Conclusion

This comprehensive API versioning implementation provides:

- ✅ **URI-based versioning** with multiple detection methods
- ✅ **Backward compatibility** with request/response transformations
- ✅ **Deprecation management** with scheduled notifications
- ✅ **Versioned documentation** with migration guides
- ✅ **Analytics and monitoring** for usage tracking
- ✅ **Comprehensive testing** and validation

The implementation ensures smooth API evolution while maintaining compatibility with existing integrations.
