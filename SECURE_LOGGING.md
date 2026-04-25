# Secure Logging Implementation

## Overview

This implementation ensures that **passwords, tokens, and PII (Personally Identifiable Information) are never logged** in application logs. The solution provides automatic sanitization of sensitive data across all logging points in the application.

## Priority: Critical (bug, monitoring, security)

## Features

### 1. Automatic Sensitive Data Sanitization
- **Passwords**: All password-related fields (password, currentPassword, newPassword, confirmPassword, etc.)
- **Tokens**: JWT tokens, access tokens, refresh tokens, authorization headers
- **PII**: Credit cards, SSN, phone numbers, addresses, dates of birth
- **Financial**: Bank accounts, routing numbers, CVV
- **Security**: OTPs, verification codes, reset tokens, PINs

### 2. Smart Detection
- JWT token pattern detection in strings
- Bearer token detection
- Case-insensitive field name matching
- Nested object sanitization
- Array sanitization

### 3. Configurable
- Environment variable configuration
- Custom sensitive field lists
- Custom replacement values
- Enable/disable functionality

## Architecture

### Components

1. **SecureLoggerService** (`src/common/secure-logging/secure-logger.service.ts`)
   - Core service that sanitizes data before logging
   - Implements NestJS LoggerService interface
   - Automatic pattern detection for tokens
   - Configurable sensitive field blacklist

2. **SecureLoggingInterceptor** (`src/common/secure-logging/secure-logging.interceptor.ts`)
   - HTTP request/response interceptor
   - Logs all incoming requests and outgoing responses
   - Automatically sanitizes request/response bodies
   - Tracks request duration

3. **SecureLoggingModule** (`src/common/secure-logging/secure-logging.module.ts`)
   - Global module that provides secure logging services
   - Automatically available throughout the application

## Usage

### Automatic Usage (Global)

The secure logging interceptor is applied globally in `main.ts`:

```typescript
import { SecureLoggingInterceptor } from './common/secure-logging/secure-logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Apply secure logging interceptor globally
  app.useGlobalInterceptors(new SecureLoggingInterceptor());
  
  await app.listen(process.env.PORT ?? 3000);
}
```

### Manual Usage in Services

Inject and use SecureLoggerService in any service:

```typescript
import { Injectable } from '@nestjs/common';
import { SecureLoggerService } from '../../common/secure-logging/secure-logger.service';

@Injectable()
export class AuthService {
  private readonly secureLogger: SecureLoggerService;

  constructor() {
    this.secureLogger = new SecureLoggerService();
  }

  async login(email: string, password: string) {
    // Safe to log - password will be automatically redacted
    this.secureLogger.log(`Login attempt`, {
      email,
      password, // Will be logged as [REDACTED]
    });
    
    // ... login logic
  }
}
```

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Secure Logging Configuration
SECURE_LOGGING_ENABLED=true
SECURE_LOGGING_REPLACEMENT_VALUE=[REDACTED]

# Comma-separated list of sensitive field names to redact (case-insensitive)
SECURE_LOGGING_SENSITIVE_FIELDS=password,passwd,pwd,secret,token,accessToken,refreshToken,authorization,auth,creditCard,cardNumber,cvv,ssn,socialSecurity,dateOfBirth,dob,phoneNumber,phone,address,bankAccount,routingNumber,pin,otp,oneTimePassword,verificationCode,resetToken,resetCode,currentPassword,newPassword,confirmPassword,oldPassword
```

### Default Sensitive Fields

The following fields are automatically sanitized (case-insensitive):

- **Authentication**: password, passwd, pwd, currentPassword, newPassword, confirmPassword, oldPassword
- **Tokens**: secret, token, accessToken, refreshToken, authorization, auth, resetToken, resetCode
- **Financial**: creditCard, cardNumber, cvv, bankAccount, routingNumber, pin
- **PII**: ssn, socialSecurity, dateOfBirth, dob, phoneNumber, phone, address
- **Security**: otp, oneTimePassword, verificationCode

### Custom Configuration

```typescript
const customLogger = new SecureLoggerService({
  sensitiveFields: ['myCustomSecret', 'apiKey'],
  replacementValue: '[CUSTOM_REDACTED]',
  enabled: true,
  maxDepth: 5,
});
```

## Examples

### Before (Insecure Logging)

```typescript
logger.log('User login', {
  email: 'user@example.com',
  password: 'SuperSecret123!', // ❌ EXPOSED IN LOGS
  token: 'eyJhbGciOiJIUzI1NiIs...', // ❌ EXPOSED IN LOGS
});
```

**Log Output:**
```json
{
  "email": "user@example.com",
  "password": "SuperSecret123!",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### After (Secure Logging)

```typescript
secureLogger.log('User login', {
  email: 'user@example.com',
  password: 'SuperSecret123!', // ✅ Automatically redacted
  token: 'eyJhbGciOiJIUzI1NiIs...', // ✅ Automatically redacted
});
```

**Log Output:**
```json
{
  "email": "user@example.com",
  "password": "[REDACTED]",
  "token": "[REDACTED]"
}
```

## What Gets Sanitized

### 1. Request Bodies
```
POST /auth/login
{
  "email": "user@example.com",
  "password": "Secret123!"  // → "[REDACTED]"
}
```

### 2. Response Bodies
```json
{
  "user": {
    "id": "123",
    "email": "user@example.com",
    "password": "[REDACTED]"  // If accidentally included
  }
}
```

### 3. Error Objects
```typescript
catch (error) {
  logger.error('Error', {
    message: error.message,
    password: error.password, // → "[REDACTED]"
    stack: error.stack // Only in development
  });
}
```

### 4. Headers
```
Authorization: Bearer eyJhbG...  // → "[REDACTED]"
```

## Testing

Run the test suite to verify secure logging:

```bash
npm test -- secure-logger.spec.ts
```

### Test Coverage

- ✅ Password field sanitization
- ✅ Token field sanitization
- ✅ PII sanitization (SSN, credit cards, etc.)
- ✅ JWT token detection in strings
- ✅ Bearer token detection
- ✅ Nested object sanitization
- ✅ Array sanitization
- ✅ Case-insensitive matching
- ✅ Custom configuration
- ✅ Enable/disable functionality
- ✅ Edge cases (null, undefined, primitives)

## Security Best Practices Implemented

1. **Defense in Depth**: Multiple layers of protection
   - Service-level sanitization
   - Interceptor-level sanitization
   - Pattern-based detection

2. **Fail-Safe Defaults**: 
   - Secure logging enabled by default
   - Comprehensive field blacklist
   - Conservative sanitization approach

3. **No Sensitive Data in Logs**:
   - Passwords never logged in plain text
   - Tokens automatically detected and redacted
   - PII fields comprehensively covered

4. **Audit Trail**:
   - All security events logged (without sensitive data)
   - Login attempts tracked
   - Failed operations logged

## Updated Components

The following components have been updated to use secure logging:

1. ✅ **AuthService** - All methods now use SecureLoggerService
2. ✅ **ValidationExceptionFilter** - Logs validation errors securely
3. ✅ **RateLimitExceptionFilter** - Logs rate limit violations securely
4. ✅ **OpenAPIValidationMiddleware** - Logs validation errors securely
5. ✅ **SecureLoggingInterceptor** - Applied globally for all HTTP requests

## Acceptance Criteria

- [x] Log sanitization middleware/interceptor implemented
- [x] Sensitive fields blacklisted (comprehensive list)
- [x] Tests for log output created
- [x] Audit log review capability (through secure logging)
- [x] Configuration via environment variables
- [x] Global application across all endpoints
- [x] JWT token pattern detection
- [x] Nested object sanitization
- [x] Case-insensitive field matching

## Monitoring & Alerting

The secure logging system integrates with your existing logging infrastructure:

- **Log Format**: JSON structured logs
- **Log Levels**: error, warn, log, debug, verbose
- **File Rotation**: Configurable max size and file count
- **Error Tracking**: Compatible with Sentry, ELK, etc.

## Future Enhancements

1. **Dynamic Configuration**: Update sensitive fields without restart
2. **Machine Learning**: Auto-detect new sensitive field patterns
3. **Compliance Reports**: GDPR, HIPAA, PCI-DSS compliance logging
4. **Real-time Alerts**: Alert on attempted sensitive data logging
5. **Performance Metrics**: Track sanitization overhead

## Troubleshooting

### Sensitive data still appearing in logs?

1. Check that `SECURE_LOGGING_ENABLED=true` in `.env`
2. Verify the field name is in the sensitive fields list
3. Check if the field is nested - increase `maxDepth` if needed
4. Ensure SecureLoggingInterceptor is applied globally

### Performance impact?

The sanitization adds minimal overhead (<1ms per log entry). If performance is critical:
- Disable in development: `SECURE_LOGGING_ENABLED=false`
- Reduce `maxDepth` for shallower sanitization
- Use a smaller sensitive fields list

## References

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [GDPR Logging Requirements](https://gdpr.eu/logging-and-monitoring/)
- [PCI-DSS Logging Requirements](https://www.pcisecuritystandards.org/)
