# API Migration Guide: v1 to v2

## Overview

This guide provides step-by-step instructions for migrating from StrellerMinds API v1 to v2. API v1 is **deprecated** and will be **removed on December 31, 2024**.

## Migration Timeline

| Date | Event | Action Required |
|------|-------|----------------|
| **January 1, 2024** | v1 Deprecated | Start migration planning |
| **March 1, 2024** | Warning Period Begins | Begin v2 integration |
| **September 1, 2024** | Sunset Notice | Complete migration |
| **December 31, 2024** | v1 Removed | v1 endpoints return 410 Gone |

## Breaking Changes Summary

### Authentication Changes

#### v1 Endpoint (Deprecated)
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "password123"
}
```

#### v2 Endpoint (Current)
```http
POST /api/v2/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "rememberMe": false
}
```

**Changes:**
- ✅ `username` field renamed to `email`
- ✅ Added optional `rememberMe` boolean field
- ✅ Enhanced security with rate limiting
- ✅ Improved error responses

#### Migration Steps:
1. Update request body to use `email` instead of `username`
2. Add `rememberMe` field if needed (defaults to `false`)
3. Update error handling for new response format

### Course Management Changes

#### v1 Endpoints (Deprecated)
```http
GET /api/v1/courses
GET /api/v1/courses/:id
POST /api/v1/courses
```

#### v2 Endpoints (Current)
```http
GET /api/v2/courses
GET /api/v2/courses/:id
POST /api/v2/courses
```

**Changes:**
- ✅ Enhanced filtering and pagination
- ✅ Improved response structure
- ✅ Additional metadata fields
- ✅ Better error handling

#### Request Changes

**v1 Query Parameters:**
```http
GET /api/v1/courses?page=1&limit=10&category=blockchain
```

**v2 Query Parameters:**
```http
GET /api/v2/courses?page=1&limit=10&category=blockchain&status=published&sortBy=createdAt&sortOrder=desc
```

**New Parameters:**
- `status`: Filter by course status (draft, published, archived)
- `sortBy`: Sort field (title, createdAt, updatedAt, price)
- `sortOrder`: Sort direction (asc, desc)

#### Response Changes

**v1 Response:**
```json
{
  "courses": [...],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

**v2 Response:**
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Migration Checklist

### Phase 1: Planning (Week 1)
- [ ] Audit current v1 usage in your application
- [ ] Identify all v1 endpoints being used
- [ ] Plan testing strategy for v2 integration
- [ ] Set up v2 development environment

### Phase 2: Development (Weeks 2-4)
- [ ] Update authentication requests
  - [ ] Change `username` to `email` in login requests
  - [ ] Add `rememberMe` field if needed
  - [ ] Update error handling
- [ ] Update course management requests
  - [ ] Add new query parameters for filtering
  - [ ] Update response parsing for new structure
  - [ ] Implement new pagination handling
- [ ] Test all API interactions
- [ ] Update API client libraries

### Phase 3: Testing (Week 5)
- [ ] Run integration tests with v2 endpoints
- [ ] Test error scenarios and edge cases
- [ ] Validate all response data parsing
- [ ] Performance testing with new endpoints

### Phase 4: Deployment (Week 6)
- [ ] Deploy to staging environment
- [ ] Run end-to-end tests
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Remove v1 fallback code

## Code Examples

### JavaScript/TypeScript Migration

#### Before (v1):
```typescript
// Authentication
const loginResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'user@example.com',
    password: 'password123'
  })
});

// Courses
const coursesResponse = await fetch('/api/v1/courses?page=1&limit=10');
const coursesData = await coursesResponse.json();
const courses = coursesData.courses;
```

#### After (v2):
```typescript
// Authentication
const loginResponse = await fetch('/api/v2/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    rememberMe: false
  })
});

// Courses
const coursesResponse = await fetch('/api/v2/courses?page=1&limit=10&status=published&sortBy=createdAt&sortOrder=desc');
const coursesData = await coursesResponse.json();
const courses = coursesData.data; // Changed from coursesData.courses
```

### Python Migration

#### Before (v1):
```python
import requests

# Authentication
login_data = {
    "username": "user@example.com",
    "password": "password123"
}
response = requests.post('/api/v1/auth/login', json=login_data)

# Courses
response = requests.get('/api/v1/courses', params={'page': 1, 'limit': 10})
courses = response.json()['courses']
```

#### After (v2):
```python
import requests

# Authentication
login_data = {
    "email": "user@example.com",  # Changed from username
    "password": "password123",
    "rememberMe": False  # New field
}
response = requests.post('/api/v2/auth/login', json=login_data)

# Courses
params = {
    'page': 1,
    'limit': 10,
    'status': 'published',  # New parameter
    'sortBy': 'createdAt',  # New parameter
    'sortOrder': 'desc'     # New parameter
}
response = requests.get('/api/v2/courses', params=params)
courses = response.json()['data']  # Changed from ['courses']
```

## Error Handling Changes

### v1 Error Response:
```json
{
  "error": "Invalid credentials",
  "code": "AUTH_FAILED"
}
```

### v2 Error Response:
```json
{
  "error": {
    "message": "Invalid credentials",
    "code": "AUTH_FAILED",
    "details": {
      "field": "email",
      "reason": "User not found"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456789"
  }
}
```

## Testing Your Migration

### 1. Validate Authentication
```bash
# Test v2 login
curl -X POST https://api.strellerminds.com/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","rememberMe":false}'
```

### 2. Validate Course Endpoints
```bash
# Test v2 courses with new parameters
curl -X GET "https://api.strellerminds.com/v2/courses?page=1&limit=5&status=published&sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Check Response Structure
Ensure your application correctly parses:
- `data` instead of `courses` in course responses
- New `meta` object with pagination information
- Enhanced error response structure

## Support and Resources

### Documentation
- [API v2 Documentation](https://docs.strellerminds.com/api/v2)
- [OpenAPI Specification](https://api.strellerminds.com/v2/openapi.json)
- [SDK Downloads](https://github.com/strellerminds/sdk)

### Support Channels
- **Email**: api-support@strellerminds.com
- **Discord**: [StrellerMinds Community](https://discord.gg/strellerminds)
- **GitHub Issues**: [API Issues](https://github.com/strellerminds/api/issues)

### Migration Assistance
- **Priority Support**: Available for enterprise customers
- **Migration Consultation**: Contact support for complex integrations
- **Testing Sandbox**: Available for migration testing

## FAQ

### Q: Can I use both v1 and v2 simultaneously?
A: Yes, but we recommend migrating completely to v2 as soon as possible. v1 will be removed on December 31, 2024.

### Q: What happens if I don't migrate by the deadline?
A: v1 endpoints will return HTTP 410 Gone status code after December 31, 2024.

### Q: Are there any performance improvements in v2?
A: Yes, v2 includes optimized database queries, better caching, and improved response times.

### Q: Can I get help with migration?
A: Yes, contact our support team for assistance with complex migration scenarios.

## Conclusion

The migration from v1 to v2 is straightforward with minimal breaking changes. The main updates involve:
1. Changing `username` to `email` in authentication
2. Updating response parsing for new data structure
3. Taking advantage of new filtering and sorting options

Start your migration early to ensure a smooth transition before the v1 sunset date.

---

**Need Help?** Contact us at api-support@strellerminds.com or join our Discord community.
