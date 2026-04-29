# Rate Limiting Documentation

## Overview

This document provides comprehensive information about the rate limiting implementation in the StrellerMinds Backend application. Rate limiting is implemented to protect against brute force attacks, prevent abuse, and ensure fair resource usage.

## Architecture

The rate limiting system consists of several components working together:

- **RateLimiterService**: Core service for tracking and enforcing rate limits
- **RateLimitGuard**: Guard implementation for protecting endpoints
- **RateLimitInterceptor**: Interceptor for flexible rate limiting
- **RateLimitDecorator**: Decorator for applying rate limits to specific routes
- **RateLimitExceptionFilter**: Exception filter for handling rate limit violations
- **RateLimitConfig**: Configuration definitions for different endpoint types

## Configuration

### Predefined Rate Limit Configurations

The system includes predefined configurations for common authentication endpoints:

```typescript
export const RATE_LIMIT_CONFIGS = {
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts
    keyPrefix: 'rl:login:',
  },
  REGISTER: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 attempts
    keyPrefix: 'rl:register:',
  },
  FORGOT_PASSWORD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 attempts
    keyPrefix: 'rl:forgot-password:',
  },
  RESET_PASSWORD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 attempts
    keyPrefix: 'rl:reset-password:',
  },
  VERIFY_EMAIL: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 attempts
    keyPrefix: 'rl:verify-email:',
  },
  REFRESH_TOKEN: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 attempts
    keyPrefix: 'rl:refresh-token:',
  },
};
```

### Configuration Parameters

- **windowMs**: Time window in milliseconds for rate limiting
- **maxRequests**: Maximum number of requests allowed within the time window
- **keyPrefix**: Unique prefix for Redis/memory keys

## Implementation Details

### RateLimiterService

The core service handles rate limit tracking and enforcement:

```typescript
@Injectable()
export class RateLimiterService {
  private store = new Map<string, { count: number; resetTime: number }>();

  isAllowed(key: string, maxRequests: number, windowMs: number): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }

  getStatus(key: string, maxRequests: number, windowMs: number): {
    count: number;
    remaining: number;
    resetTime: number;
    resetIn: number;
  }

  reset(key: string): void
  resetAll(): void
  cleanup(): void
}
```

**Note**: The current implementation uses an in-memory store suitable for development and single-instance deployments. For production environments with multiple instances, consider using Redis or a dedicated rate limiting service.

### RateLimitGuard

The guard provides endpoint protection using predefined configurations:

```typescript
export function RateLimitGuard(type: RateLimitType) {
  @Injectable()
  class RateLimitGuardImpl implements CanActivate {
    canActivate(context: ExecutionContext): boolean
  }
  return RateLimitGuardImpl;
}
```

**Usage**:
```typescript
@UseGuards(RateLimitGuard(RateLimitType.LOGIN))
@Post('login')
async login() {
  // Controller logic
}
```

### RateLimitDecorator

The decorator provides flexible rate limiting for custom configurations:

```typescript
export function RateLimit(
  maxRequests: number,
  windowMs: number,
  options?: Partial<RateLimitOptions>
)
```

**Usage**:
```typescript
@RateLimit(100, 60 * 1000) // 100 requests per minute
@Get('api/data')
async getData() {
  // Controller logic
}
```

### RateLimitInterceptor

The interceptor works with the decorator to enforce rate limits:

```typescript
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any>
}
```

## HTTP Headers

The rate limiting system sets the following HTTP headers on responses:

### Standard Headers

- **X-RateLimit-Limit**: Maximum number of requests allowed in the time window
- **X-RateLimit-Remaining**: Number of requests remaining in the current window
- **X-RateLimit-Reset**: Unix timestamp when the rate limit window resets

### Error Headers (429 Responses)

- **Retry-After**: Number of seconds until the client can retry the request
- **Content-Type**: `application/json`

### Header Examples

**Successful Response**:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1714395600000
```

**Rate Limited Response (429)**:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1714395600000
Retry-After: 300
```

## Error Handling

### Rate Limit Exceeded (429 Too Many Requests)

When a rate limit is exceeded, the system returns a 429 status code with the following response:

```json
{
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "error": "Too Many Requests",
  "retryAfter": 300,
  "resetTime": "2024-04-29T12:00:00.000Z",
  "timestamp": "2024-04-29T11:55:00.000Z"
}
```

### Specific Endpoint Messages

For predefined configurations, more specific messages are provided:

```json
{
  "statusCode": 429,
  "message": "Too many login attempts. Please try again after 300 seconds.",
  "error": "Too Many Requests",
  "type": "LOGIN",
  "retryAfter": 300,
  "resetTime": "2024-04-29T12:00:00.000Z"
}
```

## Client Implementation Guide

### Handling Rate Limits

Clients should implement proper handling of rate limit responses:

1. **Check Headers**: Always inspect rate limit headers on responses
2. **Handle 429 Responses**: When receiving a 429 status, respect the `Retry-After` header
3. **Exponential Backoff**: Implement exponential backoff for repeated failures
4. **Rate Limit Awareness**: Design applications to work within rate limits

### Example Client Implementation

```javascript
async function makeRequest(url, options = {}) {
  const response = await fetch(url, options);
  
  // Check rate limit headers
  const limit = response.headers.get('X-RateLimit-Limit');
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const reset = response.headers.get('X-RateLimit-Reset');
  
  // Handle rate limiting
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);
    // Wait and retry or inform user
  }
  
  return response;
}
```

## Security Considerations

### Key Generation

Rate limit keys are generated using:

1. **Client IP Address**: Primary identifier for rate limiting
2. **Endpoint Prefix**: Different prefixes for different endpoint types
3. **Custom Key Extractors**: Option to use custom key generation logic

### IP Address Detection

The system uses multiple methods to detect client IP addresses:

```typescript
public getClientIp(request: any): string {
  return (
    request.ip ||
    request.connection?.remoteAddress ||
    request.headers['x-forwarded-for'] ||
    'unknown'
  );
}
```

### Logging

Rate limit violations are logged securely without exposing sensitive information:

```typescript
this.secureLogger.warn('Rate limit exceeded', {
  statusCode: 429,
  retryAfter: retryAfter || Math.ceil((resetTime - Date.now()) / 1000),
});
```

## Production Considerations

### Scaling

For production environments with multiple instances:

1. **Redis Implementation**: Replace in-memory store with Redis
2. **Distributed Rate Limiting**: Ensure rate limits work across all instances
3. **Persistence**: Consider rate limit data persistence needs

### Monitoring

Monitor rate limiting metrics:

1. **Rate Limit Hits**: Track how often rate limits are triggered
2. **Endpoint Usage**: Monitor which endpoints hit limits most often
3. **IP Analysis**: Track IPs that frequently hit limits

### Configuration Tuning

Adjust rate limits based on:

1. **Traffic Patterns**: Analyze normal vs. abusive traffic
2. **Endpoint Sensitivity**: Stricter limits for sensitive operations
3. **User Behavior**: Consider user-based rate limiting for authenticated users

## Testing

### Unit Testing

Test rate limiting functionality:

```typescript
describe('RateLimiterService', () => {
  it('should allow requests within limit', () => {
    const result = service.isAllowed('test-key', 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('should block requests exceeding limit', () => {
    // Make 5 requests
    for (let i = 0; i < 5; i++) {
      service.isAllowed('test-key', 5, 60000);
    }
    const result = service.isAllowed('test-key', 5, 60000);
    expect(result.allowed).toBe(false);
  });
});
```

### Integration Testing

Test rate limiting in controller endpoints:

```typescript
describe('Auth Controller Rate Limiting', () => {
  it('should enforce login rate limit', async () => {
    // Make 5 login attempts
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });
    }

    // 6th attempt should be rate limited
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });

    expect(response.status).toBe(429);
    expect(response.headers['x-ratelimit-remaining']).toBe('0');
  });
});
```

## Troubleshooting

### Common Issues

1. **Rate Limits Not Working**: Ensure guards/interceptors are properly registered
2. **Memory Usage**: Monitor memory usage for in-memory implementation
3. **IP Detection**: Verify IP detection works behind proxies/load balancers
4. **Clock Sync**: Ensure server clocks are synchronized in distributed environments

### Debug Information

Enable debug logging to troubleshoot rate limiting issues:

```typescript
// In rate limit guard/interceptor
console.log('Rate limit check:', {
  key,
  maxRequests,
  windowMs,
  result
});
```

## Future Enhancements

### Planned Improvements

1. **Redis Integration**: Full Redis support for distributed rate limiting
2. **User-Based Limits**: Rate limiting based on authenticated user ID
3. **Dynamic Configuration**: Runtime configuration updates
4. **Advanced Algorithms**: Implement sliding window or token bucket algorithms
5. **Rate Limit Dashboard**: Admin interface for monitoring and management

### Extension Points

The system is designed to be extensible:

1. **Custom Key Extractors**: Implement domain-specific key generation
2. **Custom Storage**: Implement different storage backends
3. **Custom Algorithms**: Implement alternative rate limiting algorithms
4. **Custom Headers**: Add custom headers for specific use cases

## API Reference

### RateLimitGuard

```typescript
RateLimitGuard(type: RateLimitType) => CanActivate
```

**Parameters**:
- `type`: Predefined rate limit configuration type

### RateLimit Decorator

```typescript
RateLimit(maxRequests: number, windowMs: number, options?: Partial<RateLimitOptions>)
```

**Parameters**:
- `maxRequests`: Maximum requests allowed
- `windowMs`: Time window in milliseconds
- `options`: Additional configuration options

### RateLimitOptions Interface

```typescript
interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyExtractor?: (request: any) => string;
}
```

## Conclusion

The rate limiting system provides comprehensive protection against abuse while maintaining flexibility for different use cases. Proper configuration and monitoring ensure optimal performance and security.

For questions or contributions, please refer to the project's contribution guidelines or create an issue in the repository.
