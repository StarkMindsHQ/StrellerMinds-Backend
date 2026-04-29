# Error Codes Reference

This document provides a comprehensive reference for all error codes used throughout the StrellerMinds Backend application.

## Overview

The application uses a structured error handling system where each error is represented by a specific error code. All domain exceptions extend the base `DomainException` class and implement a `getCode()` method that returns a unique error code.

## Error Code Categories

### Domain Exception Codes

These are the core domain-level error codes that represent business logic violations:

#### Base Domain Exceptions

| Error Code | Exception Class | Description | HTTP Status |
|------------|----------------|-------------|-------------|
| `ENTITY_NOT_FOUND` | `EntityNotFoundException` | Thrown when a domain entity is not found | 404 Not Found |
| `CONSTRAINT_VIOLATION` | `DomainConstraintViolationException` | Thrown when a domain constraint is violated | 400 Bad Request |
| `INVALID_OPERATION` | `InvalidOperationException` | Thrown when an invalid operation is performed | 400 Bad Request |

#### Authentication & Authorization Errors

| Error Code | Exception Class | Description | HTTP Status |
|------------|----------------|-------------|-------------|
| `INVALID_CREDENTIALS` | `InvalidCredentialsException` | Thrown when a user attempts to login with invalid credentials | 401 Unauthorized |
| `USER_ALREADY_EXISTS` | `UserAlreadyExistsException` | Thrown when a user attempts to register with an email that already exists | 409 Conflict |
| `USER_NOT_FOUND` | `UserNotFoundException` | Thrown when a user is not found by ID | 404 Not Found |
| `PASSWORD_STRENGTH_FAILED` | `PasswordStrengthException` | Thrown when password strength validation fails | 400 Bad Request |
| `EMAIL_VERIFICATION_FAILED` | `EmailVerificationException` | Thrown when email verification fails | 400 Bad Request |

#### Course Management Errors

| Error Code | Exception Class | Description | HTTP Status |
|------------|----------------|-------------|-------------|
| `COURSE_NOT_FOUND` | `CourseNotFoundException` | Thrown when a course is not found by ID | 404 Not Found |
| `INVALID_COURSE_DATA` | `InvalidCourseDataException` | Thrown when course data is invalid | 400 Bad Request |

#### User Management Errors

| Error Code | Exception Class | Description | HTTP Status |
|------------|----------------|-------------|-------------|
| `USER_NOT_FOUND` | `UserNotFoundException` | Thrown when a user is not found by ID | 404 Not Found |
| `INVALID_USER_DATA` | `InvalidUserDataException` | Thrown when user data is invalid | 400 Bad Request |

### Framework & Infrastructure Errors

These errors are typically thrown by NestJS framework or infrastructure components:

| Error Type | Common Causes | HTTP Status |
|------------|---------------|-------------|
| `InternalServerErrorException` | Unexpected server errors, database failures | 500 Internal Server Error |
| `NotFoundException` | Resource not found at controller level | 404 Not Found |
| `ForbiddenException` | Access denied due to permissions | 403 Forbidden |
| `BadRequestException` | Invalid request parameters/validation | 400 Bad Request |
| `UnauthorizedException` | Authentication required but not provided | 401 Unauthorized |

## Error Code Structure

### Implementation Pattern

All domain exceptions follow this pattern:

```typescript
export class ExampleException extends DomainException {
  constructor(parameter: string) {
    super(`Descriptive error message with ${parameter}`);
    Object.setPrototypeOf(this, ExampleException.prototype);
  }

  getCode(): string {
    return 'EXAMPLE_ERROR_CODE';
  }
}
```

### Error Code Naming Convention

- Use `UPPER_SNAKE_CASE` for error codes
- Be descriptive and specific about the error condition
- Use consistent naming patterns across modules
- Avoid generic names like `ERROR` or `FAILED`

## HTTP Status Code Mapping

The application maps error codes to appropriate HTTP status codes:

| Error Code Pattern | HTTP Status | Use Case |
|--------------------|-------------|----------|
| `*_NOT_FOUND` | 404 Not Found | When a specific resource cannot be found |
| `*_ALREADY_EXISTS` | 409 Conflict | When trying to create a resource that already exists |
| `INVALID_*` | 400 Bad Request | When input validation fails |
| `*_FAILED` | 400 Bad Request | When a specific operation fails due to invalid state |
| `CONSTRAINT_VIOLATION` | 400 Bad Request | When business rules are violated |
| `INVALID_OPERATION` | 400 Bad Request | When an operation is not allowed in current state |

## Error Response Format

When an error occurs, the API returns a standardized error response:

```json
{
  "statusCode": 404,
  "timestamp": "2024-04-29T12:00:00.000Z",
  "path": "/api/users/123",
  "message": "User with id \"123\" not found",
  "error": "USER_NOT_FOUND"
}
```

## Exception Handling Flow

1. **Domain Layer**: Business logic throws domain exceptions with specific error codes
2. **Application Layer**: Use cases catch and re-throw exceptions if needed
3. **Controller Layer**: Exceptions are automatically handled by NestJS exception filters
4. **Response Layer**: Standardized error response is returned to the client

## Adding New Error Codes

When adding new error codes:

1. Create a new exception class extending `DomainException`
2. Implement the `getCode()` method with a unique error code
3. Follow the naming convention and patterns
4. Update this documentation
5. Consider the appropriate HTTP status code mapping

## Best Practices

- **Be Specific**: Use descriptive error codes that clearly indicate the problem
- **Consistent Naming**: Follow the established naming conventions
- **Documentation**: Always update this document when adding new error codes
- **HTTP Mapping**: Choose appropriate HTTP status codes for each error type
- **User-Friendly Messages**: Provide clear, actionable error messages for end users

## Error Code Usage Examples

### Throwing a Domain Exception

```typescript
// In a domain service or use case
throw new UserNotFoundException(userId);
```

### Handling Errors in Controllers

```typescript
try {
  // Business logic here
} catch (error) {
  if (error instanceof UserNotFoundException) {
    // Handle specific user not found error
    throw new NotFoundException(error.message);
  }
  throw error; // Re-throw other errors
}
```

### Client-Side Error Handling

```typescript
// Client-side error handling
if (response.error === 'USER_NOT_FOUND') {
  // Show user-friendly message
  showError('The user you are looking for does not exist');
} else if (response.error === 'INVALID_CREDENTIALS') {
  showError('Invalid email or password');
}
```

---

**Last Updated**: April 29, 2026  
**Version**: 1.0.0  
**Maintainer**: StrellerMinds Development Team
