# JWT Security Best Practices

This document outlines security best practices for JWT (JSON Web Token) configuration in the StrellerMinds backend application.

## Overview

JWTs are used for authentication and authorization in this application. Proper secret management is critical to prevent security vulnerabilities.

## Secret Requirements

### Minimum Length

| Environment | Minimum Length | Recommended Length |
|-------------|----------------|-------------------|
| Development | 8 characters   | 32+ characters    |
| Production   | 32 characters  | 64+ characters    |

### Secret Generation

Generate cryptographically secure secrets using one of the following methods:

```bash
# Using OpenSSL (recommended)
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Environment Variables

Configure the following environment variables:

```env
# JWT Configuration
# Minimum 32 characters (64+ recommended for production)
JWT_SECRET=your_secure_jwt_secret_here
JWT_REFRESH_SECRET=your_secure_refresh_secret_here

# Token expiration times
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_EMAIL_EXPIRES_IN=24h
JWT_PASSWORD_RESET_EXPIRES_IN=1h
```

## Security Validation

The application includes runtime validation that:

1. **Warns** in development mode if secrets are weaker than recommended
2. **Throws an error** in production mode if:
   - Secrets are not set
   - Secrets are shorter than 32 characters
   - Secrets contain placeholder/weak values (e.g., "default", "change_me", "password")

### Blocked Weak Patterns

The following patterns are blocked in production:
- `default`
- `change_me`
- `secret`
- `password`
- `admin`
- `123456`

## Production Recommendations

### 1. Use a Secrets Manager

In production, use a secrets manager instead of environment variables:

- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Azure Key Vault**
- **Google Cloud Secret Manager**

### 2. Rotate Secrets Regularly

Implement a secret rotation policy:
- Rotate JWT secrets at least every 90 days
- Have a grace period for token invalidation during rotation
- Use refresh tokens to enable smooth secret rotation

### 3. Separate Secrets

Use different secrets for different token types:
- `JWT_SECRET` - Access tokens
- `JWT_REFRESH_SECRET` - Refresh tokens
- This limits the impact if one secret is compromised

### 4. Monitor and Audit

- Log authentication failures
- Monitor for unusual token patterns
- Set up alerts for configuration changes

## Token Expiration Guidelines

| Token Type | Recommended Expiration | Use Case |
|------------|----------------------|----------|
| Access Token | 15-30 minutes | API requests |
| Refresh Token | 7-30 days | Long-lived sessions |
| Email Verification | 24 hours | Email verification links |
| Password Reset | 1 hour | Password reset links |

## Troubleshooting

### "JWT_SECRET is weak" Warning

This warning appears when:
- The secret is shorter than 32 characters
- The secret contains weak/placeholder values

**Solution**: Generate a new secure secret and update your environment configuration.

### "JWT_SECRET is not configured" Error

This error appears in production when:
- The JWT_SECRET environment variable is not set

**Solution**: Set a secure JWT_SECRET in your production environment.

## References

- [OWASP JWT Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [RFC 7519 - JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
- [NestJS JWT Documentation](https://docs.nestjs.com/security/authentication)
