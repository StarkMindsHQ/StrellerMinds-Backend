# API Documentation

This directory contains comprehensive documentation for the StrellerMinds Backend API.

## Quick Links

### For API Consumers

- **[API Overview](./API_OVERVIEW.md)** - Complete API reference with all endpoints, parameters, and examples
- **[Authentication Guide](./AUTHENTICATION_GUIDE.md)** - How to authenticate with the API, manage tokens, and implement security best practices
- **[Interactive Swagger UI](http://localhost:3000/api/docs)** - Try out endpoints directly in your browser

### For Developers

- **[OpenAPI Specification](./openapi.json)** - Machine-readable OpenAPI 3.0.3 specification
- **[Regenerating Documentation](#regenerating-documentation)** - How to update docs after code changes

## Documentation Files

| File | Purpose |
|------|---------|
| `API_OVERVIEW.md` | Complete API reference with endpoint inventory, authentication, error handling, and examples |
| `AUTHENTICATION_GUIDE.md` | Detailed authentication guide covering JWT tokens, MFA, password reset, and security best practices |
| `openapi.json` | Machine-readable OpenAPI 3.0.3 specification for API clients and tools |
| `README.md` | This file |

## Accessing the API

### Development

```bash
# Start the development server
npm run start:dev

# API will be available at:
# - Base URL: http://localhost:3000
# - Swagger UI: http://localhost:3000/api/docs
# - OpenAPI JSON: http://localhost:3000/api/docs-json
```

### Production

```bash
# Build and start production server
npm run build
npm run start:prod

# API will be available at:
# - Base URL: https://api.strellerminds.com
# - Swagger UI: https://api.strellerminds.com/api/docs
# - OpenAPI JSON: https://api.strellerminds.com/api/docs-json
```

## Regenerating Documentation

After making changes to routes, DTOs, or request/response schemas, regenerate the documentation:

```bash
# Generate OpenAPI JSON from code
npm run docs:generate

# Validate the generated OpenAPI specification
npm run docs:validate

# Commit the updated openapi.json
git add docs/openapi.json
git commit -m "docs: update API documentation"
```

### When to Regenerate

Regenerate documentation after:

- Adding new endpoints
- Modifying existing endpoints (path, method, parameters)
- Adding/removing request or response fields
- Changing validation constraints
- Updating authentication requirements
- Modifying error responses

### Validation

The `docs:validate` script checks:

- Valid OpenAPI 3.0.3 structure
- All required fields present
- No unresolved `$ref` references
- Consistent schema definitions

## API Endpoints Summary

### Authentication (11 endpoints)
- User login, registration, password reset
- Email verification, MFA setup
- Token management and refresh

### Token Management (4 endpoints)
- Logout, token verification
- Clear access/refresh tokens

### MFA (3 endpoints)
- Setup, verify, and disable multi-factor authentication

### Users (2 endpoints)
- List users with pagination
- Get user by ID

### Courses (2 endpoints)
- List courses with filtering
- Get course by ID

### Health & Status (4 endpoints)
- Simple and detailed health checks
- Kubernetes liveness/readiness probes

### Database Monitoring (7 endpoints)
- Connection pool health and statistics
- Pool utilization and circuit breaker status
- Database metrics and recommendations

### GDPR Compliance (4 endpoints)
- Export user data (data portability)
- Delete user data (right-to-be-forgotten)
- Data retention policies

### Contract Testing (8 endpoints)
- OpenAPI specification management
- Request/response validation
- Endpoint coverage reporting

**Total: 45+ endpoints**

## Authentication

All endpoints use JWT (JSON Web Tokens) for authentication:

- **Tokens**: Transmitted via secure httpOnly cookies or Authorization header
- **Access Token**: 15-minute expiration
- **Refresh Token**: 7-day expiration
- **MFA**: Optional multi-factor authentication support

See [Authentication Guide](./AUTHENTICATION_GUIDE.md) for detailed information.

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error message",
  "error": "ErrorCode",
  "requestId": "unique-request-id",
  "timestamp": "2026-04-29T00:00:00Z",
  "path": "/endpoint",
  "errors": {
    "field": ["validation error"]
  }
}
```

## Rate Limiting

Certain endpoints are rate-limited to prevent abuse:

- Login: 10 attempts/minute
- Registration: 10 attempts/minute
- Password reset: 10 attempts/minute
- Email verification: 10 attempts/minute

## Using the Swagger UI

1. Navigate to `http://localhost:3000/api/docs`
2. Click "Authorize" to enter your JWT token
3. Click "Try it out" on any endpoint to test it
4. View request/response schemas and examples

## Importing into API Clients

### Postman

1. Open Postman
2. Click "Import"
3. Select "Link" tab
4. Enter: `http://localhost:3000/api/docs-json`
5. Click "Continue" and "Import"

### Insomnia

1. Open Insomnia
2. Click "Create" → "Request Collection"
3. Click "Import" → "From URL"
4. Enter: `http://localhost:3000/api/docs-json`
5. Click "Fetch and Import"

### VS Code REST Client

Create a `.http` file:

```http
@baseUrl = http://localhost:3000
@token = your-jwt-token

### Get health status
GET {{baseUrl}}/health

### Login
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

### Get authenticated user profile
GET {{baseUrl}}/auth/profile
Authorization: Bearer {{token}}
```

## Generating Client SDKs

The OpenAPI specification can be used to generate client SDKs:

```bash
# Generate TypeScript client
npx openapi-generator-cli generate \
  -i docs/openapi.json \
  -g typescript-axios \
  -o generated/typescript-client

# Generate Python client
npx openapi-generator-cli generate \
  -i docs/openapi.json \
  -g python \
  -o generated/python-client

# Generate Go client
npx openapi-generator-cli generate \
  -i docs/openapi.json \
  -g go \
  -o generated/go-client
```

## Support

- **Issues**: https://github.com/StarkMindsHQ/StrellerMinds-Backend/issues
- **Discussions**: https://github.com/StarkMindsHQ/StrellerMinds-Backend/discussions
- **Email**: contact@strellerminds.com

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.0.1 | 2026-04-29 | Initial API release with comprehensive Swagger documentation |

## License

UNLICENSED - See LICENSE file for details
