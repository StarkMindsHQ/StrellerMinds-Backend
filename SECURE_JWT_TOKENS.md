# Secure JWT Token Storage with HttpOnly Cookies

## Overview

This implementation provides secure JWT token storage using httpOnly cookies instead of localStorage. This prevents XSS (Cross-Site Scripting) attacks that could otherwise steal tokens from the JavaScript scope.

## Architecture

### Key Components

#### 1. Cookie Configuration (`src/auth/config/cookie.config.ts`)
- Defines standardized cookie configuration for tokens
- Supports separate access and refresh token cookies
- Configurable based on environment (HTTP-only in production)

```typescript
JWT_COOKIE_CONFIG: {
  name: 'accessToken',
  maxAge: 15 * 60 * 1000,      // 15 minutes
  httpOnly: true,               // Cannot be accessed by JavaScript
  secure: true,                 // HTTPS only in production
  sameSite: 'lax',              // CSRF protection
}

REFRESH_TOKEN_COOKIE_CONFIG: {
  name: 'refreshToken',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
}
```

#### 2. Cookie Token Service (`src/auth/services/cookie-token.service.ts`)
- Manages token operations via secure cookies
- Methods to set, get, and clear tokens
- Transparent API for cookie management

Available methods:
- `setAccessTokenCookie(response, token)` - Set access token
- `setRefreshTokenCookie(response, token)` - Set refresh token
- `setAuthTokenCookies(response, accessToken, refreshToken)` - Set both
- `getAccessToken(request)` - Retrieve access token
- `getRefreshToken(request)` - Retrieve refresh token
- `clearAuthTokenCookies(response)` - Logout and clear all tokens

#### 3. JWT Cookie Strategy (`src/auth/strategies/jwt-cookie.strategy.ts`)
- Passport strategy that extracts JWT from cookies
- Fallback to Authorization header for testing/mobile
- Automatic token validation

Extraction priority:
1. httpOnly cookies (secure)
2. Authorization header (fallback for mobile/testing)

#### 4. JWT Cookie Guard (`src/auth/guards/jwt-cookie.guard.ts`)
- NestJS authentication guard for protected routes
- Works seamlessly with JWT Cookie Strategy
- Usage: `@UseGuards(JwtCookieGuard)`

#### 5. Token Controller (`src/auth/controllers/token.controller.ts`)
Provides token management endpoints:
- `POST /auth/tokens/logout` - Clear all auth tokens
- `POST /auth/tokens/verify` - Validate current token
- `POST /auth/tokens/clear-access` - Clear access token only
- `POST /auth/tokens/clear-refresh` - Clear refresh token only

#### 6. Auth Response DTOs (`src/auth/dtos/auth-response.dto.ts`)
Safe response objects that **do not expose tokens in JSON**:
- `LoginResponseDto` - Login response without token
- `RegisterResponseDto` - Registration response without token
- `RefreshResponseDto` - Token refresh response without token
- `LogoutResponseDto` - Logout confirmation
- `TokenValidityDto` - Token validation status

Example response:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "createdAt": "2026-04-22T10:30:00Z"
  },
  "message": "Login successful"
}
```

The JWT token is **only** in the httpOnly cookie, not in the response body.

## Security Features

### 1. HttpOnly Cookies
- **Cannot be accessed by JavaScript** - Prevents XSS attacks
- Compromised frontend JavaScript cannot steal tokens
- Tokens are automatically sent with requests via browser
- Browser enforces same-origin policy

### 2. Secure Flag
- **HTTPS only in production** - Prevents man-in-the-middle attacks
- Development uses HTTP for testing
- Set via `secure: process.env.NODE_ENV === 'production'`

### 3. SameSite Protection
- **Value: 'lax'** - Prevents CSRF attacks
- Cookies only sent on same-site requests
- Blocks cross-site request forgery attempts

### 4. Token Separation
- **Access tokens**: Short-lived (15 minutes)
- **Refresh tokens**: Longer-lived (7 days)
- Separate cookies with independent expiration

### 5. No Token in Response Body
- DTOs specifically exclude token fields
- Response JSON never contains the token
- Only the httpOnly cookie carries the token

## Usage

### Login Request
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### Login Response
```http
HTTP/1.1 200 OK
Set-Cookie: accessToken=eyJhbGc...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=900
Set-Cookie: refreshToken=eyJhbGc...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
Content-Type: application/json

{
  "user": {
    "id": "abc123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "createdAt": "2026-04-22T10:30:00Z"
  },
  "message": "Login successful"
}
```

**Important**: The token is in the `Set-Cookie` header, NOT in the JSON body.

### Protected Request
The browser automatically includes cookies in the request:
```bash
GET /auth/profile
Cookie: accessToken=eyJhbGc...; refreshToken=eyJhbGc...
```

The JWT Cookie Strategy automatically extracts the token from the cookie.

### Logout Request
```bash
POST /auth/tokens/logout
```

Response:
```http
HTTP/1.1 200 OK
Set-Cookie: accessToken=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0
Set-Cookie: refreshToken=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0
Content-Type: application/json

{
  "message": "Logged out successfully"
}
```

Cookies are cleared by setting Max-Age=0 (immediate expiration).

## Frontend Integration

### With Credentials
```javascript
// Include credentials in fetch requests
fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',  // Include cookies in request
  body: JSON.stringify({ email, password })
})
.then(res => res.json())
.then(data => {
  // Token is automatically stored in httpOnly cookie
  // No need to manually handle token
  console.log('Logged in as:', data.user.email);
});
```

### Axios Configuration
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true  // Include cookies in requests
});

// Make authenticated requests
api.get('/auth/profile')
  .then(res => console.log('User:', res.data))
  .catch(err => console.error('Not authenticated'));
```

### Protected Routes
Routes that require authentication automatically use JwtCookieGuard:
```typescript
@Get('profile')
@UseGuards(JwtCookieGuard)
getProfile(@Request() req) {
  return req.user;
}
```

## Token Refresh Flow

1. **Initial Login** - User receives both access and refresh tokens
2. **Token Expiration** - Access token expires after 15 minutes
3. **Automatic Refresh** - Frontend detects 401 and requests new token
4. **New Tokens** - Server validates refresh token and issues new access token
5. **Continue** - User continues with new access token

Example refresh implementation:
```javascript
const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true
});

api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Refresh the access token
      await api.post('/auth/refresh');
      // Retry original request
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

## Environment Configuration

Set in `.env`:
```env
# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Cookie Configuration
COOKIE_DOMAIN=.example.com  # Optional: for subdomain sharing
NODE_ENV=production          # Enables HTTPS-only cookies

# Server
PORT=3000
```

## Migration from localStorage

### Old Approach (Insecure)
```javascript
// ❌ DO NOT USE - Vulnerable to XSS
localStorage.setItem('token', response.data.token);
// If XSS executes: const token = localStorage.getItem('token');
```

### New Approach (Secure)
```javascript
// ✅ RECOMMENDED - Secure from XSS
const response = await fetch('/auth/login', {
  credentials: 'include'  // Include cookies
});
// Token is in httpOnly cookie, JavaScript cannot access it
// Browser automatically sends it in subsequent requests
```

## Browser Security

### HttpOnly Cookie Behavior
```
✅ Can: Browser automatically includes in requests
✅ Can: Server can set via Set-Cookie header
❌ Cannot: JavaScript access via document.cookie
❌ Cannot: Access from different domains
❌ Cannot: Steal via XSS attacks
```

### Testing HttpOnly Cookies
```bash
# You'll see the cookie in response headers
curl -i https://api.example.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass"}'

# Response includes:
# Set-Cookie: accessToken=...; HttpOnly; Secure; ...

# For subsequent requests, provide cookies explicitly
curl https://api.example.com/auth/profile \
  -b "accessToken=..."
```

## Production Considerations

### HTTPS Requirements
- httpOnly cookies require HTTPS in production
- Automatic in production (NODE_ENV=production)
- Self-signed certificates OK for internal APIs

### CORS Configuration
If frontend is on different domain:
```typescript
app.enableCors({
  origin: 'https://example.com',
  credentials: true,  // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
});
```

### Domain Sharing
To share tokens across subdomains:
```env
COOKIE_DOMAIN=.example.com
```

Then cookies are sent to: `api.example.com`, `auth.example.com`, etc.

### Token Rotation
Implement periodic token rotation:
- Refresh token before expiration
- Invalidate old refresh tokens
- Track refresh token versions

## Troubleshooting

### Cookies Not Being Set
1. Check HTTPS in production
2. Verify response includes Set-Cookie header
3. Ensure credentials: 'include' in fetch

### Cookies Not Being Sent
1. Verify withCredentials: true in axios
2. Check CORS origin matches frontend domain
3. Ensure credentials: 'include' in fetch

### CORS Errors with Cookies
```typescript
// Enable CORS with credentials
app.enableCors({
  origin: true,
  credentials: true
});
```

### Testing Without HTTPS
Development mode accepts HTTP cookies:
```env
NODE_ENV=development
```

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/login` | No | Login with credentials |
| POST | `/auth/register` | No | Create new account |
| POST | `/auth/forgot-password` | No | Request password reset |
| POST | `/auth/reset-password` | No | Reset password with token |
| POST | `/auth/refresh` | No* | Refresh access token |
| POST | `/auth/verify-email` | No | Verify email address |
| POST | `/auth/update-password` | Yes | Change password |
| GET | `/auth/profile` | Yes | Get user profile |
| POST | `/auth/tokens/logout` | Yes | Logout and clear tokens |
| POST | `/auth/tokens/verify` | Yes | Verify token validity |

*requires valid refresh token cookie

## Related Files

- `src/auth/config/cookie.config.ts` - Cookie configurations
- `src/auth/services/cookie-token.service.ts` - Token management
- `src/auth/strategies/jwt-cookie.strategy.ts` - Passport strategy
- `src/auth/guards/jwt-cookie.guard.ts` - Authentication guard
- `src/auth/controllers/token.controller.ts` - Token endpoints
- `src/auth/dtos/auth-response.dto.ts` - Response models
- `src/main.ts` - Application bootstrap

## Testing

### Test Scenario: Login and Protected Request
```bash
# 1. Login
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

# Response includes Set-Cookie headers:
# Set-Cookie: accessToken=...; HttpOnly; ...
# Set-Cookie: refreshToken=...; HttpOnly; ...

# 2. Access protected resource (browser automatically includes cookies)
curl -i http://localhost:3000/auth/profile -b "cookies.txt"

# 3. Logout
curl -i -X POST http://localhost:3000/auth/tokens/logout \
  -b "cookies.txt"

# Response clears cookies:
# Set-Cookie: accessToken=; HttpOnly; Max-Age=0; ...
# Set-Cookie: refreshToken=; HttpOnly; Max-Age=0; ...
```

## References

- [OWASP: Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [MDN: Same-Site Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [NestJS: Authentication](https://docs.nestjs.com/security/authentication)
