# Advanced API Documentation and Developer Portal Implementation

## Overview

A comprehensive API documentation system with interactive explorer, SDK generation, developer portal, API analytics, versioning, and testing tools.

## Features Implemented

### 1. Comprehensive OpenAPI 3.0 Documentation
- ✅ Enhanced Swagger UI with custom styling
- ✅ Multiple authentication methods (Bearer, API Key, Basic, OAuth2)
- ✅ Comprehensive endpoint documentation
- ✅ Request/response examples
- ✅ External documentation links
- ✅ OpenAPI JSON and YAML endpoints

**Files:**
- `src/main.ts` (enhanced Swagger configuration)

### 2. Interactive API Explorer
- ✅ Code examples in multiple languages (cURL, JavaScript, TypeScript, Python)
- ✅ Endpoint details with parameters and examples
- ✅ Try-it-out functionality
- ✅ Request snippet generation

**Files:**
- `src/documentation/services/api-explorer.service.ts`

### 3. SDK Generation
- ✅ Multi-language SDK generation (TypeScript, JavaScript, Python, Java)
- ✅ Package file generation (package.json, requirements.txt, setup.py)
- ✅ SDK download tracking
- ✅ Customizable package names

**Files:**
- `src/documentation/services/sdk-generator.service.ts`
- `src/documentation/entities/sdk-download.entity.ts`

### 4. Developer Portal with Authentication
- ✅ API key management (create, update, revoke)
- ✅ API key tiers (Free, Basic, Professional, Enterprise)
- ✅ Rate limiting per API key
- ✅ IP and origin restrictions
- ✅ API key usage tracking

**Files:**
- `src/documentation/services/api-key.service.ts`
- `src/documentation/entities/api-key.entity.ts`
- `src/documentation/guards/api-key.guard.ts`

### 5. API Analytics and Usage Tracking
- ✅ Request tracking (endpoint, method, status, response time)
- ✅ Analytics dashboard data
- ✅ Endpoint-specific analytics
- ✅ Time series data
- ✅ Top API keys tracking
- ✅ Error tracking

**Files:**
- `src/documentation/services/api-analytics.service.ts`
- `src/documentation/entities/api-usage.entity.ts`
- `src/documentation/interceptors/api-usage.interceptor.ts`

### 6. API Versioning and Deprecation Management
- ✅ Version management (create, deprecate, sunset)
- ✅ Endpoint registration and tracking
- ✅ Deprecation notices and migration guides
- ✅ Breaking changes tracking
- ✅ Automatic migration guide generation

**Files:**
- `src/documentation/services/api-versioning.service.ts`
- `src/documentation/entities/api-version.entity.ts`
- `src/documentation/entities/api-endpoint.entity.ts`

### 7. API Testing Tools
- ✅ Test suite execution
- ✅ Test case management
- ✅ Assertion framework
- ✅ Test generation from OpenAPI spec
- ✅ Test results reporting

**Files:**
- `src/documentation/services/api-testing.service.ts`

## Database Schema

### Tables Created
1. **api_keys** - API key management
2. **api_usage** - API usage tracking
3. **api_versions** - API version management
4. **api_endpoints** - Endpoint documentation and tracking
5. **sdk_downloads** - SDK generation and downloads

### Migration
- `src/migrations/1710000000000-CreateDocumentationTables.ts`

## API Endpoints

### API Key Management
- `POST /api/documentation/api-keys` - Create API key
- `GET /api/documentation/api-keys` - Get user's API keys
- `GET /api/documentation/api-keys/:id` - Get API key details
- `PUT /api/documentation/api-keys/:id` - Update API key
- `DELETE /api/documentation/api-keys/:id` - Revoke API key

### SDK Generation
- `POST /api/documentation/sdks/generate` - Generate SDK
- `GET /api/documentation/sdks` - Get available SDKs
- `GET /api/documentation/sdks/:id/download` - Download SDK

### API Analytics
- `GET /api/documentation/analytics` - Get analytics
- `GET /api/documentation/analytics/endpoints/:endpoint` - Get endpoint analytics

### API Versioning
- `GET /api/documentation/versions` - Get all versions
- `GET /api/documentation/versions/current` - Get current version
- `GET /api/documentation/versions/:id` - Get version details
- `GET /api/documentation/versions/migration/:from/:to` - Get migration guide
- `GET /api/documentation/endpoints/deprecated` - Get deprecated endpoints

### API Explorer
- `GET /api/documentation/explorer/spec` - Get OpenAPI spec
- `GET /api/documentation/explorer/endpoints/:path` - Get endpoint details

### API Testing
- `POST /api/documentation/testing/run` - Run test suite
- `POST /api/documentation/testing/generate` - Generate test suite

## Enhanced Swagger Endpoints

- `GET /api/docs` - Interactive Swagger UI
- `GET /api/docs-json` - OpenAPI JSON specification
- `GET /api/docs-yaml` - OpenAPI YAML specification (requires js-yaml)

## Usage Examples

### Create API Key
```typescript
const response = await fetch('/api/documentation/api-keys', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'My API Key',
    tier: 'professional',
    rateLimit: 5000,
  }),
});

const { apiKey, response: keyInfo } = await response.json();
// Save apiKey immediately - it's only shown once!
```

### Use API Key
```bash
curl -H "X-API-Key: sk_YOUR_API_KEY" \
  https://api.strellerminds.com/api/users
```

### Generate SDK
```typescript
const response = await fetch('/api/documentation/sdks/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    language: 'typescript',
    version: 'v1',
  }),
});
```

### Get Analytics
```typescript
const analytics = await fetch('/api/documentation/analytics?startDate=2024-01-01&endDate=2024-01-31', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
  },
});
```

## Integration

### Using API Key Guard
```typescript
@Controller('external')
@UseGuards(ApiKeyGuard) // Use API key instead of JWT
export class ExternalController {
  // Endpoints accessible via API key
}
```

### Using API Usage Interceptor
The interceptor automatically tracks API usage when API keys are used. No additional setup required.

## Configuration

### Environment Variables
No additional environment variables required. Uses existing:
- Database configuration
- JWT configuration (for developer portal authentication)

### Optional Dependencies
- `js-yaml` - For YAML endpoint (optional)
- `archiver` - For SDK ZIP compression (optional, can use directory structure)

## Next Steps

1. **Run Migration**: `npm run migration:run`
2. **Start Application**: `npm run start:dev`
3. **Access Documentation**: 
   - Swagger UI: `http://localhost:3000/api/docs`
   - Developer Portal: `http://localhost:3000/api/documentation`
4. **Create API Key**: Use the developer portal endpoints
5. **Generate SDK**: Request SDK generation for your preferred language

## Features Summary

✅ Comprehensive OpenAPI 3.0 documentation  
✅ Interactive API explorer with code examples  
✅ Multi-language SDK generation  
✅ Developer portal with API key management  
✅ API analytics and usage tracking  
✅ API versioning and deprecation management  
✅ API testing tools and test generation  
✅ Enhanced Swagger UI with custom styling  
✅ Multiple authentication methods  
✅ Rate limiting per API key  
✅ IP and origin restrictions  

## Testing

All endpoints are protected with JWT authentication. Use Swagger UI to test with authentication.

## Notes

- API keys are hashed using bcrypt before storage
- Raw API key is only shown once during creation
- SDK generation can be resource-intensive - consider async processing
- Analytics tracking is asynchronous to avoid blocking requests
- Rate limiting is per-hour (simplified - use Redis for production)
