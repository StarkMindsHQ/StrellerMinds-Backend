# API Contract Testing Implementation

This directory contains a comprehensive API contract testing suite for the StrellerMinds Backend, addressing issue #612 - Missing API Contract Testing.

## 🎯 Overview

The implementation provides:
- **OpenAPI specification validation**
- **Contract testing for all endpoints**
- **Backward compatibility testing**
- **API documentation testing**
- **Contract versioning**

## 📁 Structure

```
contract-testing/
├── package.json                    # Dependencies and scripts
├── contract-test.config.js          # Jest configuration
├── tsconfig.json                   # TypeScript configuration
├── src/
│   └── contract-test-helper.ts      # Core testing utilities
├── tests/
│   ├── setup.ts                    # Test environment setup
│   ├── auth.contract.test.ts        # Authentication contract tests
│   ├── users.contract.test.ts       # User management contract tests
│   ├── comprehensive.contract.test.ts # Full API coverage tests
│   └── additional-endpoints.contract.test.ts # Other endpoint tests
├── scripts/
│   ├── validate-openapi.js         # OpenAPI specification validation
│   ├── backward-compatibility.js    # Compatibility checking
│   ├── generate-contract-docs.js   # Documentation generation
│   └── generate-pr.js             # PR content generation
├── reports/                       # Generated reports (created at runtime)
└── docs/                         # Generated documentation (created at runtime)
```

## 🚀 Quick Start

### Installation

```bash
cd contract-testing
npm install
```

### Running Tests

```bash
# Run all contract tests
npm run test:contract

# Run with coverage
npm run test:contract:coverage

# Watch mode for development
npm run test:contract:watch
```

### Validation

```bash
# Validate OpenAPI specification
npm run test:contract:validate

# Check backward compatibility
npm run test:contract:compatibility

# Generate documentation
npm run docs:contract
```

## 📊 Features

### 1. Contract Test Helper

The `ContractTestHelper` class provides:
- **Response validation** against OpenAPI schemas
- **Request body validation** 
- **Endpoint existence checking**
- **Schema extraction** from OpenAPI specs
- **HTTP request execution** with validation

### 2. Test Coverage

- **Authentication endpoints**: register, login, refresh, logout, profile
- **User management**: CRUD operations, bulk updates, file uploads
- **Additional endpoints**: courses, payments, files, health checks
- **Comprehensive validation**: schemas, methods, status codes, headers

### 3. Validation Scripts

#### OpenAPI Validation
- Validates specification against OpenAPI standards
- Checks for missing operation IDs, descriptions, tags
- Generates detailed validation reports
- Provides improvement recommendations

#### Backward Compatibility
- Compares current vs previous API specifications
- Detects breaking changes (removed endpoints, modified parameters)
- Tracks non-breaking changes (added endpoints, new responses)
- Generates compatibility reports

#### Documentation Generation
- Creates comprehensive API documentation
- Generates both JSON and Markdown formats
- Analyzes endpoint coverage and quality
- Provides actionable recommendations

### 4. Contract Versioning

- **API version decorators** for endpoint versioning
- **Version guards** for request validation
- **Deprecation headers** for sunset endpoints
- **Migration path support** for smooth transitions

## 📈 Reports

### Validation Reports

Generated in `reports/` directory:
- `openapi-validation.json` - Specification validation results
- `compatibility-report.json` - Backward compatibility analysis
- `current-openapi.json` - Current API specification snapshot

### Documentation

Generated in `docs/` directory:
- `contract-documentation.json` - Detailed API analysis
- `CONTRACT_DOCUMENTATION.md` - Human-readable documentation

## 🔧 Configuration

### Jest Configuration

The test suite uses Jest with:
- TypeScript support via ts-jest
- 30-second timeout for integration tests
- Coverage reporting
- JUnit XML output for CI/CD

### Environment Setup

Tests require:
- Running NestJS application (or built dist files)
- OpenAPI specification accessible at `/api/docs-json`
- Database connection (for integration tests)

## 🧪 Test Examples

### Basic Contract Test

```typescript
const result = await contractHelper.makeRequestAndValidate({
  method: 'POST',
  path: '/auth/register',
  expectedStatus: 201,
  body: userData
});

expect(result.contractValid).toBe(true);
expect(result.validation.valid).toBe(true);
```

### Schema Validation

```typescript
const validation = contractHelper.validateRequestBody('POST', '/auth/register', userData);
expect(validation.valid).toBe(true);
```

### Endpoint Coverage

```typescript
const endpoints = contractHelper.getAllEndpoints();
expect(endpoints.length).toBeGreaterThan(0);
```

## 🚨 Integration

### CI/CD Pipeline

Add to your CI pipeline:

```yaml
- name: Run Contract Tests
  run: |
    cd contract-testing
    npm install
    npm run test:contract
    npm run test:contract:validate
    npm run test:contract:compatibility
```

### Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "cd contract-testing && npm run test:contract"
    }
  }
}
```

## 📝 Benefits

1. **Prevents Breaking Changes**: Automated detection of contract violations
2. **Ensures Consistency**: Standardized response structures and error handling
3. **Improves Developer Experience**: Clear documentation and examples
4. **Facilitates Migration**: Smooth version transitions with proper deprecation
5. **Enhances Quality**: Comprehensive validation and testing coverage

## 🔄 Maintenance

- Update test data when API contracts change
- Review validation reports regularly
- Keep dependencies up to date
- Add new endpoint tests as API grows

## 🐛 Troubleshooting

### Common Issues

1. **Server not running**: Start the NestJS application before running tests
2. **Type errors**: Ensure TypeScript dependencies are installed
3. **Validation failures**: Check OpenAPI specification for errors
4. **Timeout issues**: Increase test timeout in configuration

### Debug Mode

```bash
# Run with verbose output
npm run test:contract -- --verbose

# Run specific test file
npm run test:contract -- auth.contract.test.ts
```

This comprehensive implementation ensures API contract integrity and prevents breaking changes while providing excellent developer experience and documentation.
