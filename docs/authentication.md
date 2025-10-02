# Authentication Flow Documentation

## Overview

The StrellerMinds platform uses JWT (JSON Web Tokens) for authentication. This document outlines the authentication flow, token structure, and security measures implemented.

## Authentication Flow

### 1. Login Process

1. User submits credentials (email and password)
2. System validates credentials against database
3. If valid, generates:
   - Access Token (1 hour expiry)
   - Refresh Token (7 days expiry)
4. Returns tokens and user information

### 2. Token Structure

#### Access Token

```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "roles": ["STUDENT"],
  "iat": 1234567890,
  "exp": 1234567890
}
```

#### Refresh Token

- Same structure as access token
- Longer expiration time (7 days)
- Stored hashed in database

### 3. Protected Routes

- Routes are protected by default
- Use `@Public()` decorator to make routes public
- Token validation includes:
  - Signature verification
  - Expiration check
  - User existence verification

### 4. Token Refresh

1. Client sends refresh token
2. Server validates refresh token
3. If valid, issues new access and refresh tokens
4. Invalid refresh tokens result in logout

### 5. Error Handling

- Invalid credentials: 401 Unauthorized
- Expired token: 401 Unauthorized with "Token has expired"
- Invalid token: 401 Unauthorized with "Invalid token"
- Unverified email: 401 Unauthorized with "Please verify your email first"

## Security Measures

### 1. Token Security

- Access tokens expire in 1 hour
- Refresh tokens expire in 7 days
- Refresh tokens are hashed before storage
- Tokens include minimal necessary claims

### 2. Password Security

- Passwords are hashed using bcrypt
- Minimum password length: 8 characters
- Email verification required

### 3. Route Protection

- Global JWT guard implementation
- Role-based access control
- Public route decorator for unprotected endpoints

## API Endpoints

### Authentication

- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh tokens
- `POST /auth/logout` - User logout

### Example Usage

#### Login Request

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Login Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "roles": ["STUDENT"]
  }
}
```

## Best Practices

1. Always use HTTPS
2. Store tokens securely on client side
3. Implement proper token refresh logic
4. Handle token expiration gracefully
5. Use appropriate error messages
6. Implement rate limiting for login attempts
7. Monitor failed login attempts
