# StrellerMinds Backend API Documentation

## Overview

The StrellerMinds Backend API is a comprehensive RESTful API for a blockchain education platform built on the Stellar network. It provides secure user management, course delivery, and seamless Stellar blockchain integration for on-chain learning verification and credentialing.

**API Version**: 0.0.1  
**Base URL**: 
- Development: `http://localhost:3000`
- Production: `https://api.strellerminds.com`

## Accessing the API Documentation

### Interactive Swagger UI

The API includes an interactive Swagger UI for exploring and testing endpoints:

- **URL**: `http://localhost:3000/api/docs`
- **Features**:
  - Browse all available endpoints
  - View request/response schemas
  - Execute "Try it out" requests directly from the UI
  - Persistent authentication across requests

### OpenAPI JSON

The complete OpenAPI specification is available at:

- **URL**: `http://localhost:3000/api/docs-json`
- **Format**: OpenAPI 3.0.3 JSON
- **Use Cases**: 
  - Import into API clients (Postman, Insomnia, etc.)
  - Generate client SDKs
  - Integrate with API documentation tools

### Static Export

A static OpenAPI JSON file is committed to the repository:

- **Location**: `docs/openapi.json`
- **Purpose**: Version control and CI/CD integration
- **Regeneration**: Run `npm run docs:generate` after any route or DTO changes

## Authentication

### JWT Bearer Tokens

The API uses JWT (JSON Web Tokens) for authentication. Tokens are typically transmitted via secure httpOnly cookies but can also be passed in the Authorization header.

#### Token Transmission Methods

1. **httpOnly Cookies (Recommended)**
   - Tokens are automatically set in secure httpOnly cookies after login
   - Prevents XSS attacks by making tokens inaccessible to JavaScript
   - Automatically included in requests by the browser

2. **Authorization Header (For Testing/Mobile)**
   - Format: `Authorization: Bearer <token>`
   - Example: `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### Using Authentication in Swagger UI

1. Click the **"Authorize"** button in the top-right corner
2. Enter your JWT token in the format: `Bearer <your-token-here>`
3. Click **"Authorize"**
4. The token will be automatically included in all subsequent "Try it out" requests

#### Token Expiration

- **Access Token**: 15 minutes (default)
- **Refresh Token**: 7 days (default)
- **Email Verification Token**: 24 hours
- **Password Reset Token**: 1 hour

### Obtaining Tokens

#### Login

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

Response:
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "createdAt": "2026-04-29T00:00:00Z"
  },
  "message": "Login successful"
}
```

Access token is set in httpOnly cookie automatically.

#### Refresh Token

```bash
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## API Endpoints

### Health & Status

| Method | Path | Description | Auth Required |
|--------|------|-------------|----------------|
| GET | `/` | Simple health check | No |
| GET | `/health` | Detailed health check | No |
| GET | `/health/live` | Liveness probe (Kubernetes) | No |
| GET | `/health/ready` | Readiness probe (Kubernetes) | No |

### Authentication

| Method | Path | Description | Auth Required |
|--------|------|-------------|----------------|
| GET | `/auth/csrf-token` | Get CSRF token | No |
| POST | `/auth/login` | User login | No |
| POST | `/auth/register` | User registration | No |
| POST | `/auth/refresh` | Refresh access token | No |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password with token | No |
| POST | `/auth/verify-email` | Verify email address | No |
| POST | `/auth/update-password` | Update password (authenticated) | Yes |
| POST | `/auth/check-password-strength` | Check password strength | No |
| GET | `/auth/password-policy` | Get password policy | No |
| GET | `/auth/profile` | Get authenticated user profile | Yes |

### Token Management

| Method | Path | Description | Auth Required |
|--------|------|-------------|----------------|
| POST | `/auth/tokens/logout` | User logout | No |
| POST | `/auth/tokens/verify` | Verify token validity | Yes |
| POST | `/auth/tokens/clear-access` | Clear access token | No |
| POST | `/auth/tokens/clear-refresh` | Clear refresh token | No |

### Multi-Factor Authentication (MFA)

| Method | Path | Description | Auth Required |
|--------|------|-------------|----------------|
| POST | `/auth/mfa/setup` | Setup MFA | Yes |
| POST | `/auth/mfa/verify` | Verify and enable MFA | Yes |
| POST | `/auth/mfa/disable` | Disable MFA | Yes |

### Users

| Method | Path | Description | Auth Required |
|--------|------|-------------|----------------|
| GET | `/users` | List all users (paginated) | No |
| GET | `/users/:id` | Get user by ID | No |

### Courses

| Method | Path | Description | Auth Required |
|--------|------|-------------|----------------|
| GET | `/courses` | List all courses (paginated) | No |
| GET | `/courses/:id` | Get course by ID | No |

### Database Monitoring

| Method | Path | Description | Auth Required |
|--------|------|-------------|----------------|
| GET | `/database/pool/health` | Check connection pool health | No |
| GET | `/database/pool/stats` | Get current pool statistics | No |
| GET | `/database/pool/stats/recent` | Get recent pool statistics history | No |
| GET | `/database/pool/utilization` | Get average pool utilization | No |
| GET | `/database/pool/circuit-breaker` | Get circuit breaker state | No |
| GET | `/database/metrics/connection` | Check database connection status | No |
| GET | `/database/metrics/pool-size` | Get recommended pool size | No |

### GDPR Compliance

| Method | Path | Description | Auth Required |
|--------|------|-------------|----------------|
| GET | `/gdpr/export/:userId` | Export user data (GDPR portability) | No |
| DELETE | `/gdpr/users/:userId` | Delete user data (GDPR right-to-be-forgotten) | No |
| GET | `/gdpr/retention-policies` | Get data retention policies | No |
| DELETE | `/gdpr/retention-policies/apply` | Apply retention policies | No |

### Contract Testing (Admin)

| Method | Path | Description | Auth Required |
|--------|------|-------------|----------------|
| GET | `/admin/contract-testing/specification` | Get OpenAPI specification | Yes |
| GET | `/admin/contract-testing/endpoints` | Get all API endpoints | Yes |
| GET | `/admin/contract-testing/stats` | Get validation statistics | Yes |
| POST | `/admin/contract-testing/validate/request` | Validate request against spec | Yes |
| POST | `/admin/contract-testing/validate/response` | Validate response against spec | Yes |
| POST | `/admin/contract-testing/reload-specification` | Reload OpenAPI specification | Yes |
| DELETE | `/admin/contract-testing/cache` | Clear validation cache | Yes |
| GET | `/admin/contract-testing/coverage` | Get endpoint coverage report | Yes |

## Error Handling

All error responses follow a consistent format:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "error": "BadRequest",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-04-29T00:00:00Z",
  "path": "/auth/login",
  "errors": {
    "email": ["Email must be a valid email address"],
    "password": ["Password must be at least 8 characters long"]
  }
}
```

### Common Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful GET, POST, PUT, DELETE |
| 201 | Created | Successful resource creation |
| 204 | No Content | Successful DELETE with no response body |
| 400 | Bad Request | Validation error, invalid input |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists (e.g., duplicate email) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Database or external service down |

## Rate Limiting

The API implements rate limiting on certain endpoints to prevent abuse:

### Rate-Limited Endpoints

- `POST /auth/login` - 10 attempts per minute
- `POST /auth/register` - 10 attempts per minute
- `POST /auth/refresh` - 10 attempts per minute
- `POST /auth/forgot-password` - 10 attempts per minute
- `POST /auth/reset-password` - 10 attempts per minute
- `POST /auth/verify-email` - 10 attempts per minute

### Rate Limit Response

When rate limit is exceeded:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "error": "TooManyRequests",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-04-29T00:00:00Z",
  "path": "/auth/login",
  "errors": {
    "retryAfter": 45,
    "resetTime": "2026-04-29T00:01:00Z"
  }
}
```

## Request/Response Examples

### Example: User Registration

**Request:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePassword123!",
    "passwordConfirm": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "newuser@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "createdAt": "2026-04-29T00:00:00Z"
  },
  "message": "Registration successful"
}
```

### Example: List Courses with Pagination

**Request:**
```bash
curl -X GET "http://localhost:3000/courses?category=blockchain&difficulty=beginner&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Introduction to Blockchain",
      "description": "Learn the basics of blockchain technology",
      "category": "blockchain",
      "difficulty": "beginner",
      "createdAt": "2026-04-29T00:00:00Z"
    }
  ],
  "nextCursor": "eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMiJ9"
}
```

## Pagination

List endpoints support cursor-based pagination:

**Query Parameters:**
- `cursor` (optional): Pagination cursor from previous response
- `limit` (optional): Number of items to return (default: 20)
- `search` (optional): Search term for filtering

**Response Headers:**
- `X-Next-Cursor`: Cursor for fetching the next page

## Security Considerations

1. **HTTPS Only**: Always use HTTPS in production
2. **Token Storage**: Store tokens in secure httpOnly cookies when possible
3. **CSRF Protection**: All state-changing operations are protected against CSRF attacks
4. **Input Validation**: All inputs are validated and sanitized
5. **Rate Limiting**: Endpoints are rate-limited to prevent abuse
6. **Secure Logging**: Sensitive data (passwords, tokens) is never logged

## Support & Documentation

- **Interactive API Docs**: `http://localhost:3000/api/docs`
- **OpenAPI Spec**: `http://localhost:3000/api/docs-json`
- **GitHub Repository**: https://github.com/StarkMindsHQ/StrellerMinds-Backend
- **Issues & Bug Reports**: https://github.com/StarkMindsHQ/StrellerMinds-Backend/issues

## Regenerating Documentation

After making changes to routes or DTOs, regenerate the OpenAPI documentation:

```bash
npm run docs:generate
npm run docs:validate
```

This ensures the Swagger UI and static OpenAPI export stay in sync with your code.
