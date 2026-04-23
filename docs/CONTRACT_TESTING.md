# OpenAPI Contract Testing Documentation

## Overview

This document provides comprehensive guidance for OpenAPI contract testing in the StrellerMinds Backend application. Contract testing ensures that all API endpoints conform to the defined OpenAPI specification, maintaining API consistency and reliability.

## Table of Contents
- [Introduction](#introduction)
- [Architecture](#architecture)
- [OpenAPI Specification](#openapi-specification)
- [Validation Service](#validation-service)
- [Middleware Integration](#middleware-integration)
- [Testing Framework](#testing-framework)
- [CI/CD Integration](#cicd-integration)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)

---

## Introduction

### What is Contract Testing?

Contract testing validates that API requests and responses conform to a predefined contract (OpenAPI specification). This ensures:

- **API Consistency**: All endpoints behave as documented
- **Breaking Change Detection**: Changes that violate contracts are caught early
- **Documentation Accuracy**: The specification matches actual implementation
- **Integration Reliability**: Client applications can trust the API contract

### Benefits

1. **Early Error Detection**: Catch contract violations during development
2. **Automated Validation**: Continuous checking in CI/CD pipelines
3. **Documentation Generation**: Always up-to-date API documentation
4. **Client Confidence**: Reliable API contracts for frontend and third-party integrations
5. **Quality Assurance**: Higher API quality and consistency

---

## Architecture

### Components

```
OpenAPI Specification (api-specification.yaml)
         |
         v
OpenAPI Validation Service
         |
    +----+----+
    |         |
    v         v
Middleware  Controller
(Real-time) (Admin API)
    |         |
    v         v
Application  Monitoring
   Requests    & Alerts
```

### Key Components

#### 1. OpenAPI Specification
- **File**: `api-specification.yaml`
- **Format**: OpenAPI 3.0.3
- **Content**: Complete API definition with schemas, parameters, responses

#### 2. Validation Service
- **Class**: `OpenAPIValidationService`
- **Purpose**: Core validation logic and caching
- **Features**: Request/response validation, schema compilation, performance optimization

#### 3. Validation Middleware
- **Class**: `OpenAPIValidationMiddleware`
- **Purpose**: Real-time request/response validation
- **Integration**: Applied globally to all API endpoints

#### 4. Admin Controller
- **Class**: `ContractTestingController`
- **Purpose**: Monitoring and management endpoints
- **Features**: Statistics, coverage reports, specification management

---

## OpenAPI Specification

### Specification Structure

The OpenAPI specification (`api-specification.yaml`) contains:

```yaml
openapi: 3.0.3
info:
  title: StrellerMinds Backend API
  version: 1.0.0
servers:
  - url: http://localhost:3000
  - url: https://api.strellerminds.com
paths:
  # API endpoints
components:
  schemas:
    # Data models
  securitySchemes:
    # Authentication schemes
```

### Endpoint Definition Example

```yaml
/users:
  get:
    tags:
      - Users
    summary: Get all users
    operationId: getAllUsers
    security:
      - bearerAuth: []
    parameters:
      - name: page
        in: query
        schema:
          type: integer
          minimum: 1
          default: 1
    responses:
      '200':
        description: Users retrieved successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UsersListResponse'
```

### Schema Definition Example

```yaml
components:
  schemas:
    UserResponse:
      type: object
      required:
        - id
        - email
        - firstName
        - lastName
        - role
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        firstName:
          type: string
          minLength: 1
          maxLength: 50
        lastName:
          type: string
          minLength: 1
          maxLength: 50
        role:
          type: string
          enum: [user, admin, instructor]
```

---

## Validation Service

### Core Features

#### Request Validation
```typescript
const validation = openApiValidation.validateRequest(
  method,      // HTTP method
  path,        // Request path
  headers,     // Request headers
  query,       // Query parameters
  body         // Request body
);
```

#### Response Validation
```typescript
const validation = openApiValidation.validateResponse(
  method,      // HTTP method
  path,        // Request path
  statusCode,  // HTTP status code
  headers,     // Response headers
  body         // Response body
);
```

### Validation Types

#### 1. Schema Validation
- **Request Bodies**: JSON schema validation
- **Response Bodies**: JSON schema validation
- **Parameters**: Type and format validation
- **Headers**: Schema validation

#### 2. Structural Validation
- **Required Fields**: Mandatory field presence
- **Data Types**: Correct type enforcement
- **Format Validation**: Email, UUID, date formats
- **Enum Values**: Allowed value validation

#### 3. Business Logic Validation
- **Parameter Constraints**: Min/max values, patterns
- **Response Codes**: Expected status codes
- **Content Types**: Media type validation
- **Authentication**: Required security schemes

### Performance Optimization

#### Caching
```typescript
// Validation results are cached for performance
const cacheKey = this.generateCacheKey(method, path, type, body);
if (this.validationCache.has(cacheKey)) {
  return this.validationCache.get(cacheKey);
}
```

#### Schema Pre-compilation
```typescript
// JSON schemas are pre-compiled for faster validation
const compiledSchema = this.ajv.compile(schema);
this.schemaCache.set(schemaName, compiledSchema);
```

---

## Middleware Integration

### Global Application Setup

```typescript
// src/main.ts
import { OpenAPIValidationMiddleware } from './common/contract-testing/openapi-validation.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Apply OpenAPI validation middleware globally
  const openApiValidation = app.get(OpenAPIValidationMiddleware);
  app.use(openApiValidation);
  
  await app.listen(process.env.PORT ?? 3000);
}
```

### Middleware Behavior

#### Request Processing
1. **Intercept Request**: Captures incoming requests
2. **Validate Request**: Checks against OpenAPI specification
3. **Log Violations**: Records any validation errors
4. **Continue/Reject**: Passes valid requests, rejects invalid ones (strict mode)

#### Response Processing
1. **Intercept Response**: Captures outgoing responses
2. **Validate Response**: Checks against OpenAPI specification
3. **Log Violations**: Records any validation errors
4. **Return Response**: Always returns response (warnings in strict mode)

### Configuration Options

```typescript
// Environment variables
OPENAPI_VALIDATION_ENABLED=true          // Enable/disable validation
OPENAPI_VALIDATION_STRICT=false          // Strict mode (reject invalid requests)
OPENAPI_VALIDATE_REQUESTS=true           // Validate incoming requests
OPENAPI_VALIDATE_RESPONSES=true          // Validate outgoing responses
OPENAPI_LOG_VIOLATIONS=true              // Log validation violations
OPENAPI_REPORT_VIOLATIONS=true           // Generate violation reports
OPENAPI_CACHE_VALIDATION=true            // Enable validation caching
OPENAPI_MAX_CACHE_SIZE=1000              // Maximum cache entries
```

---

## Testing Framework

### Test Structure

```
test/contract/
openapi-contract.spec.ts                 # Main contract test suite
```

### Test Categories

#### 1. Request Validation Tests
```typescript
describe('Authentication Endpoints', () => {
  it('should validate valid login request', () => {
    const loginRequest = {
      email: 'test@example.com',
      password: 'password123',
    };

    const validation = openApiValidation.validateRequest(
      'POST',
      '/auth/login',
      { 'content-type': 'application/json' },
      {},
      loginRequest
    );

    expect(validation.isValid).toBe(true);
  });
});
```

#### 2. Response Validation Tests
```typescript
describe('Response Validation', () => {
  it('should validate successful response structure', () => {
    const mockResponse = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
      // ... other fields
    };

    const validation = openApiValidation.validateResponse(
      'GET',
      '/users/550e8400-e29b-41d4-a716-446655440000',
      200,
      { 'content-type': 'application/json' },
      mockResponse
    );

    expect(validation.isValid).toBe(true);
  });
});
```

#### 3. Error Handling Tests
```typescript
describe('Error Handling', () => {
  it('should handle validation of undefined endpoints gracefully', () => {
    const validation = openApiValidation.validateRequest(
      'GET',
      '/nonexistent/endpoint',
      { 'authorization': 'Bearer token123' },
      {}
    );

    expect(validation.isValid).toBe(false);
    expect(validation.errors[0].code).toBe('ENDPOINT_NOT_FOUND');
  });
});
```

#### 4. Performance Tests
```typescript
describe('Performance', () => {
  it('should validate requests within acceptable time limits', () => {
    const startTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
      openApiValidation.validateRequest('GET', '/users', {}, {});
    }
    
    const averageTime = (Date.now() - startTime) / 100;
    expect(averageTime).toBeLessThan(10); // Less than 10ms per validation
  });
});
```

### Running Tests

```bash
# Run all contract tests
npm run test:contract

# Run specific test categories
npm run test:contract:request      # Request validation tests
npm run test:contract:response     # Response validation tests
npm run test:contract:coverage     # Coverage tests
npm run test:contract:performance  # Performance tests

# Run with coverage
npm run test:contract:cov

# Watch mode for development
npm run test:contract:watch
```

---

## CI/CD Integration

### GitHub Actions Workflow

The contract testing workflow (`.github/workflows/contract-testing.yml`) includes:

#### 1. Specification Validation
```yaml
contract-spec-validation:
  name: Validate OpenAPI Specification
  runs-on: ubuntu-latest
  steps:
    - name: Validate OpenAPI specification syntax
      run: npx @apidevtools/swagger-parser validate api-specification.yaml
    
    - name: Check specification completeness
      run: node scripts/validate-spec-completeness.js
```

#### 2. Contract Tests
```yaml
contract-tests:
  name: Run Contract Tests
  strategy:
    matrix:
      test-suite: [request-validation, response-validation, endpoint-coverage, performance]
  steps:
    - name: Run specific contract test suite
      run: npm run test:contract:${{ matrix.test-suite }}
```

#### 3. Compliance Check
```yaml
contract-compliance-check:
  name: Contract Compliance Check
  steps:
    - name: Run live contract validation
      run: node scripts/live-contract-validation.js
    
    - name: Generate compliance report
      run: node scripts/generate-compliance-report.js
```

#### 4. Contract Diff
```yaml
contract-diff:
  name: Contract Changes Detection
  if: github.event_name == 'pull_request'
  steps:
    - name: Generate contract diff
      run: node scripts/contract-diff.js
    
    - name: Comment PR with contract changes
      uses: actions/github-script@v7
```

### Pipeline Triggers

#### Automatic Triggers
- **Push to main/develop**: Full contract validation
- **Pull Requests**: Contract diff and validation
- **Daily Schedule**: Automated compliance checks

#### Manual Triggers
- **Specification Updates**: Re-validate after changes
- **Emergency Deployments**: Quick validation checks

---

## Configuration

### Environment Configuration

```bash
# .env
# OpenAPI Contract Testing
OPENAPI_VALIDATION_ENABLED=true
OPENAPI_VALIDATION_STRICT=false
OPENAPI_VALIDATE_REQUESTS=true
OPENAPI_VALIDATE_RESPONSES=true
OPENAPI_LOG_VIOLATIONS=true
OPENAPI_REPORT_VIOLATIONS=true
OPENAPI_SPEC_PATH=./api-specification.yaml
OPENAPI_CACHE_VALIDATION=true
OPENAPI_MAX_CACHE_SIZE=1000
```

### Service Configuration

```typescript
// src/common/contract-testing/contract-testing.module.ts
@Module({
  imports: [ConfigModule],
  providers: [
    OpenAPIValidationService,
    OpenAPIValidationMiddleware,
  ],
  exports: [OpenAPIValidationService, OpenAPIValidationMiddleware],
})
export class ContractTestingModule {}
```

### Validation Rules Configuration

```typescript
// Custom validation rules
const validationConfig = {
  strictMode: false,              // Reject invalid requests
  validateResponses: true,        // Validate responses
  validateRequests: true,         // Validate requests
  logViolations: true,             // Log violations
  reportViolations: true,          // Generate reports
  cacheValidation: true,           // Enable caching
  maxCacheSize: 1000,              // Cache size limit
};
```

---

## Usage Examples

### Basic Validation

```typescript
// Validate a request
const requestValidation = openApiValidation.validateRequest(
  'POST',
  '/auth/login',
  { 'content-type': 'application/json' },
  {},
  { email: 'test@example.com', password: 'password123' }
);

if (!requestValidation.isValid) {
  console.error('Request validation failed:', requestValidation.errors);
}
```

### Response Validation

```typescript
// Validate a response
const responseValidation = openApiValidation.validateResponse(
  'GET',
  '/users/123',
  200,
  { 'content-type': 'application/json' },
  { id: '123', email: 'test@example.com', firstName: 'Test', lastName: 'User' }
);

if (!responseValidation.isValid) {
  console.error('Response validation failed:', responseValidation.errors);
}
```

### Admin Monitoring

```typescript
// Get validation statistics
GET /admin/contract-testing/stats

// Get all endpoints
GET /admin/contract-testing/endpoints

// Get OpenAPI specification
GET /admin/contract-testing/specification

// Validate custom request
POST /admin/contract-testing/validate/request
{
  "method": "POST",
  "path": "/auth/login",
  "headers": { "content-type": "application/json" },
  "query": {},
  "body": { "email": "test@example.com", "password": "password123" }
}
```

### Cache Management

```typescript
// Clear validation cache
DELETE /admin/contract-testing/cache

// Reload specification
POST /admin/contract-testing/reload-specification
```

---

## Troubleshooting

### Common Issues

#### 1. Specification Loading Errors
```
Error: OpenAPI specification loading failed: ENOENT
```

**Solution**: 
- Verify `api-specification.yaml` exists
- Check `OPENAPI_SPEC_PATH` environment variable
- Validate YAML syntax

#### 2. Validation Failures
```
Contract validation error: ENDPOINT_NOT_FOUND
```

**Solution**:
- Check if endpoint exists in specification
- Verify HTTP method and path format
- Update specification with missing endpoints

#### 3. Schema Validation Errors
```
Request body validation error: must be string
```

**Solution**:
- Review request body against schema
- Check data types and required fields
- Validate JSON structure

#### 4. Performance Issues
```
Validation taking too long
```

**Solution**:
- Enable caching: `OPENAPI_CACHE_VALIDATION=true`
- Increase cache size: `OPENAPI_MAX_CACHE_SIZE=2000`
- Optimize schema definitions

### Debugging Tools

#### 1. Validation Logs
```typescript
// Enable debug logging
process.env.LOG_LEVEL = 'debug';

// Check validation logs
console.log(validation.errors);
console.log(validation.warnings);
```

#### 2. Specification Validation
```bash
# Validate OpenAPI syntax
npx @apidevtools/swagger-parser validate api-specification.yaml

# Check for common issues
npx @stoplight/spectral lint api-specification.yaml
```

#### 3. Test Debugging
```bash
# Run tests with verbose output
npm run test:contract -- --verbose

# Run specific test with debugging
npm run test:contract -- --testNamePattern="specific test" --debug
```

### Performance Optimization

#### 1. Caching Strategy
```typescript
// Pre-compile schemas for better performance
private precompileSchemas(): void {
  const schemas = this.openApiSpec.components.schemas;
  for (const [name, schema] of Object.entries(schemas)) {
    const compiled = this.ajv.compile(schema);
    this.schemaCache.set(name, compiled);
  }
}
```

#### 2. Validation Optimization
```typescript
// Use efficient validation patterns
const validate = this.ajv.compile(schema);
const isValid = validate(data);

// Cache validation results
const cacheKey = this.generateCacheKey(method, path, type, data);
if (this.validationCache.has(cacheKey)) {
  return this.validationCache.get(cacheKey);
}
```

#### 3. Memory Management
```typescript
// Clear cache when it gets too large
if (this.validationCache.size >= this.config.maxCacheSize) {
  const firstKey = this.validationCache.keys().next().value;
  this.validationCache.delete(firstKey);
}
```

---

## Best Practices

### Specification Management

1. **Version Control**: Always version your OpenAPI specification
2. **Documentation**: Keep descriptions and examples up to date
3. **Consistency**: Use consistent naming and patterns
4. **Validation**: Regularly validate specification syntax

### Testing Strategy

1. **Comprehensive Coverage**: Test all endpoints and scenarios
2. **Edge Cases**: Include error conditions and edge cases
3. **Performance**: Monitor validation performance
4. **Automation**: Integrate into CI/CD pipeline

### Monitoring

1. **Violation Tracking**: Monitor contract violations
2. **Performance Metrics**: Track validation performance
3. **Coverage Reports**: Monitor endpoint coverage
4. **Alerting**: Set up alerts for critical violations

### Maintenance

1. **Regular Updates**: Keep specification current with implementation
2. **Review Changes**: Review specification changes carefully
3. **Documentation**: Update documentation when needed
4. **Training**: Train team on contract testing practices

---

This comprehensive OpenAPI contract testing system ensures API reliability, consistency, and quality across the StrellerMinds Backend application.
