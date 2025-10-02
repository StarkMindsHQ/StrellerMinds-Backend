# Error Handling Guide

This document outlines the standardized error handling system implemented across all API endpoints in the StrellerMinds Backend.

## Error Response Format

All API errors follow this JSON structure:

```json
{
  "errorCode": "ERROR_CODE",
  "statusCode": 400,
  "message": "Human readable error message",
  "timestamp": "2025-05-03T10:00:00Z",
  "path": "/api/resource",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Fields Explanation

- `errorCode`: A unique identifier for the type of error (see Error Codes section)
- `statusCode`: HTTP status code
- `message`: Human-readable error message (i18n supported)
- `timestamp`: ISO timestamp when the error occurred
- `path`: The API endpoint that generated the error
- `details`: Optional array of field-specific errors (commonly used for validation errors)

## Error Codes

### Authentication & Authorization

- `UNAUTHORIZED`: Authentication required (401)
- `INVALID_CREDENTIALS`: Invalid login credentials (401)
- `TOKEN_EXPIRED`: JWT token has expired (401)
- `FORBIDDEN`: Insufficient permissions (403)

### Resource Errors

- `NOT_FOUND`: Requested resource doesn't exist (404)
- `ALREADY_EXISTS`: Resource creation conflicts with existing data (409)
- `CONFLICT`: Request conflicts with current state (409)

### Validation Errors

- `INVALID_INPUT`: Generic validation error (400)
- `MISSING_REQUIRED_FIELD`: Required field is missing (400)
- `INVALID_FORMAT`: Field format is invalid (400)

### Business Logic Errors

- `INSUFFICIENT_FUNDS`: Not enough funds for transaction (400)
- `PAYMENT_FAILED`: Payment processing failed (400)
- `COURSE_NOT_AVAILABLE`: Requested course is unavailable (400)
- `ENROLLMENT_CLOSED`: Course enrollment period ended (400)

### System Errors

- `INTERNAL_ERROR`: Unhandled server error (500)
- `SERVICE_UNAVAILABLE`: Service temporarily down (503)
- `DATABASE_ERROR`: Database operation failed (500)
- `EXTERNAL_SERVICE_ERROR`: External API call failed (502)

## Internationalization (i18n)

Error messages support multiple languages. Set the `Accept-Language` header to receive localized error messages:

- English: `Accept-Language: en`
- French: `Accept-Language: fr`

## Usage Examples

### Throwing Errors in Controllers/Services

```typescript
// Using CustomException
throw new CustomException(ErrorCode.NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND);

// With validation details
throw new CustomException(ErrorCode.INVALID_INPUT, 'Validation failed', HttpStatus.BAD_REQUEST, [
  {
    field: 'email',
    message: 'Invalid email format',
  },
]);
```

### Sample Error Responses

#### 404 Not Found

```json
{
  "errorCode": "NOT_FOUND",
  "statusCode": 404,
  "message": "The requested resource was not found",
  "timestamp": "2025-05-03T10:00:00Z",
  "path": "/api/users/123"
}
```

#### 400 Validation Error

```json
{
  "errorCode": "INVALID_INPUT",
  "statusCode": 400,
  "message": "Invalid input data provided",
  "timestamp": "2025-05-03T10:00:00Z",
  "path": "/api/users",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

## Best Practices

1. Always use the `CustomException` class for throwing errors
2. Include meaningful error messages that can help clients resolve the issue
3. Use appropriate HTTP status codes
4. Include validation details when applicable
5. Don't expose sensitive information in error messages
6. Log internal errors appropriately
7. Use i18n for all user-facing error messages

## Development Notes

- Stack traces are only included in development environment
- All errors are automatically logged
- Validation errors are automatically formatted with field details
- Custom error codes can be added to `error-codes.enum.ts`
- New translations should be added to both `en.json` and `fr.json`
