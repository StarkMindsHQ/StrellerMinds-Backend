# Authentication Guide

## Overview

The StrellerMinds Backend API uses JWT (JSON Web Tokens) for authentication. This guide explains how to authenticate with the API and manage tokens.

## Authentication Methods

### 1. httpOnly Cookies (Recommended)

Tokens are automatically set in secure httpOnly cookies after successful login. This method is recommended because:

- **XSS Protection**: Tokens are inaccessible to JavaScript, preventing XSS attacks
- **Automatic Transmission**: Tokens are automatically included in requests
- **Secure Flag**: Cookies are marked as secure and httpOnly
- **CSRF Protection**: Works seamlessly with CSRF protection

#### How It Works

1. User logs in with email and password
2. Server validates credentials
3. Server generates JWT tokens (access + refresh)
4. Tokens are set in secure httpOnly cookies
5. Browser automatically includes cookies in subsequent requests

#### Example: Login with Cookies

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

The `-c cookies.txt` flag saves cookies for subsequent requests.

#### Example: Authenticated Request with Cookies

```bash
curl -X GET http://localhost:3000/auth/profile \
  -b cookies.txt
```

The `-b cookies.txt` flag includes saved cookies in the request.

### 2. Authorization Header (For Testing/Mobile)

For scenarios where cookies aren't available (mobile apps, API clients), tokens can be passed in the Authorization header.

#### Format

```
Authorization: Bearer <jwt-token>
```

#### Example

```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJpYXQiOjE2ODk2MDAwMDAsImV4cCI6MTY4OTYwMDkwMH0.signature"
```

## Token Types

### Access Token

- **Purpose**: Authenticate API requests
- **Expiration**: 15 minutes (default)
- **Storage**: httpOnly cookie or Authorization header
- **Usage**: Included in every authenticated request

### Refresh Token

- **Purpose**: Obtain a new access token when current one expires
- **Expiration**: 7 days (default)
- **Storage**: httpOnly cookie (separate from access token)
- **Usage**: Sent to `/auth/refresh` endpoint to get new access token

## Authentication Flow

### Login Flow

```
1. User submits email + password to POST /auth/login
2. Server validates credentials
3. Server generates access token (15m expiry) + refresh token (7d expiry)
4. Tokens set in httpOnly cookies
5. User info returned in response
6. Client can now make authenticated requests
```

### Token Refresh Flow

```
1. Access token expires (after 15 minutes)
2. Client sends refresh token to POST /auth/refresh
3. Server validates refresh token
4. Server generates new access token
5. New access token set in httpOnly cookie
6. Client continues making authenticated requests
```

### Logout Flow

```
1. User calls POST /auth/tokens/logout
2. Server clears auth cookies
3. Tokens are invalidated
4. User must login again to access protected endpoints
```

## Using Authentication in Swagger UI

### Step 1: Login

1. Navigate to `http://localhost:3000/api/docs`
2. Find the `POST /auth/login` endpoint
3. Click "Try it out"
4. Enter test credentials:
   ```json
   {
     "email": "user@example.com",
     "password": "SecurePassword123!"
   }
   ```
5. Click "Execute"
6. Note the response with user information

### Step 2: Authorize

1. Click the green **"Authorize"** button in the top-right corner
2. In the dialog, enter your JWT token in the format:
   ```
   Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Click **"Authorize"**
4. Click **"Close"**

### Step 3: Make Authenticated Requests

1. Find any endpoint with a lock icon (requires authentication)
2. Click "Try it out"
3. The token is automatically included in the request
4. Click "Execute"

## Password Requirements

Passwords must meet the following criteria:

- **Minimum Length**: 8 characters
- **Maximum Length**: 128 characters
- **Uppercase Letters**: At least one (A-Z)
- **Lowercase Letters**: At least one (a-z)
- **Numbers**: At least one (0-9)
- **Special Characters**: At least one (!@#$%^&*()_+-=[]{}|;:,.<>?)

### Example Valid Passwords

- `SecurePassword123!`
- `MyP@ssw0rd2024`
- `Str0ng#Pass123`

### Example Invalid Passwords

- `password123` (no uppercase, no special char)
- `PASSWORD123!` (no lowercase)
- `Pass123` (too short, no special char)
- `Pass!` (too short)

## Checking Password Strength

Before registering or changing passwords, you can check password strength:

```bash
curl -X POST http://localhost:3000/auth/check-password-strength \
  -H "Content-Type: application/json" \
  -d '{
    "password": "SecurePassword123!"
  }'
```

Response:
```json
{
  "isValid": true,
  "strength": "strong",
  "percentage": 95,
  "description": "Very strong password",
  "errors": [],
  "score": 95
}
```

## Multi-Factor Authentication (MFA)

### Setup MFA

1. Authenticate with your account
2. Call `POST /auth/mfa/setup`
3. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
4. Save backup codes in a secure location
5. Verify with 6-digit code from authenticator app

### Verify and Enable MFA

```bash
curl -X POST http://localhost:3000/auth/mfa/verify \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "123456"
  }'
```

### Disable MFA

```bash
curl -X POST http://localhost:3000/auth/mfa/disable \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "123456"
  }'
```

## Password Reset Flow

### Step 1: Request Password Reset

```bash
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

Response (always returns 200 for security):
```json
{
  "message": "If email exists, password reset link has been sent"
}
```

### Step 2: Reset Password with Token

User receives email with reset link containing token. Then:

```bash
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "resetToken": "token-from-email",
    "newPassword": "NewSecurePassword123!",
    "passwordConfirm": "NewSecurePassword123!"
  }'
```

## Email Verification

### Verify Email Address

After registration, user receives verification email with token:

```bash
curl -X POST http://localhost:3000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "token-from-email"
  }'
```

## Token Management Endpoints

### Verify Token Validity

```bash
curl -X POST http://localhost:3000/auth/tokens/verify \
  -H "Authorization: Bearer <token>"
```

Response:
```json
{
  "isValid": true,
  "message": "Token is valid",
  "email": "user@example.com"
}
```

### Clear Access Token

```bash
curl -X POST http://localhost:3000/auth/tokens/clear-access
```

### Clear Refresh Token

```bash
curl -X POST http://localhost:3000/auth/tokens/clear-refresh
```

### Logout

```bash
curl -X POST http://localhost:3000/auth/tokens/logout
```

## CSRF Protection

All state-changing operations (POST, PUT, DELETE) are protected against CSRF attacks.

### Getting CSRF Token

```bash
curl -X GET http://localhost:3000/auth/csrf-token
```

Response:
```json
{
  "csrfToken": "csrf-token-value"
}
```

The CSRF token is automatically set in a cookie and should be included in the `X-CSRF-Token` header for state-changing requests.

## Security Best Practices

1. **Use HTTPS**: Always use HTTPS in production
2. **Secure Token Storage**: Store tokens in secure httpOnly cookies when possible
3. **Token Expiration**: Access tokens expire after 15 minutes; refresh tokens after 7 days
4. **Logout on Sensitive Changes**: Logout users when they change password or disable MFA
5. **Monitor Failed Attempts**: Track failed login attempts and implement account lockout
6. **Secure Password**: Use strong, unique passwords
7. **Enable MFA**: Enable multi-factor authentication for additional security
8. **Never Share Tokens**: Never share your JWT tokens with anyone
9. **Rotate Tokens**: Regularly refresh access tokens using refresh tokens
10. **Clear Cookies**: Clear cookies when logging out

## Troubleshooting

### "Invalid credentials" Error

- Verify email address is correct
- Verify password is correct
- Check that account is active

### "Token expired" Error

- Refresh your access token using the refresh token
- Call `POST /auth/refresh` with your refresh token

### "Unauthorized" Error

- Ensure you're including the Authorization header
- Verify token format: `Authorization: Bearer <token>`
- Check that token hasn't expired

### "Too many requests" Error

- Rate limit exceeded on this endpoint
- Wait for the time specified in `retryAfter` field
- Try again after the reset time

### "CSRF token invalid" Error

- Get a new CSRF token from `GET /auth/csrf-token`
- Include the token in the `X-CSRF-Token` header
- Ensure cookies are enabled

## Environment-Specific Configuration

### Development

- JWT Secret: `default-secret` (from .env)
- Token Expiry: 15 minutes
- HTTPS: Not required
- CORS: Allows localhost:3000

### Production

- JWT Secret: Loaded from secure secrets manager
- Token Expiry: 15 minutes
- HTTPS: Required
- CORS: Restricted to allowed origins
- Rate Limiting: Enforced
- CSRF Protection: Enabled

## Additional Resources

- [JWT.io](https://jwt.io) - JWT documentation and debugger
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [API Security Best Practices](https://owasp.org/www-project-api-security/)
