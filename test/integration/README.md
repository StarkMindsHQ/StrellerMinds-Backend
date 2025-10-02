# Integration Tests for StrellerMinds Backend

This directory contains comprehensive integration tests for critical user flows in the StrellerMinds backend application.

## Overview

Integration tests verify that different parts of the application work together correctly by testing complete user workflows from end-to-end. These tests cover:

- **User Registration Flow**: Complete user registration with validation, authentication, and database persistence
- **Course Enrollment**: Full course enrollment process including payment processing and progress tracking
- **Certificate Generation**: Certificate creation, verification, and blockchain integration
- **Payment Processing**: Payment flows, subscriptions, refunds, and financial transactions
- **Blockchain Interaction**: Wallet connections, credential management, and cross-chain operations

## Test Structure

### Test Suites

1. **`user-registration.integration.spec.ts`**
   - User registration with validation
   - Email verification flow
   - Password strength validation
   - Input sanitization and security
   - Concurrent registration handling

2. **`course-enrollment.integration.spec.ts`**
   - Course enrollment for paid and free courses
   - Prerequisites validation
   - Capacity limits
   - Progress tracking and completion
   - Quiz submissions and grading

3. **`certificate-generation.integration.spec.ts`**
   - Certificate generation upon course completion
   - Professional certification requirements
   - Batch certificate generation
   - Certificate verification system
   - QR code generation and verification

4. **`payment-processing.integration.spec.ts`**
   - Course purchase payments
   - Subscription management
   - Refund processing
   - Payment security and validation
   - International payments and tax handling

5. **`blockchain-interaction.integration.spec.ts`**
   - Wallet connection and authentication
   - Stellar blockchain operations
   - Credential management on blockchain
   - Cross-chain operations
   - Security and compliance

## Running Tests

### Prerequisites

Before running integration tests, ensure you have:

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v13 or higher) - Optional, tests can run with mocks
3. **Environment variables** configured in `.env.test`

### Individual Test Suites

Run specific test suites using the following commands:

```bash
# Run all integration tests
npm run test:integration

# Run specific test suites
npm run test:integration:user-registration
npm run test:integration:course-enrollment
npm run test:integration:certificate-generation
npm run test:integration:payment-processing
npm run test:integration:blockchain-interaction
npm run test:integration:auth
```

### Using the Test Runner

The custom test runner (`scripts/run-integration-tests.js`) provides additional features:

```bash
# Run with the test runner directly
node scripts/run-integration-tests.js all
node scripts/run-integration-tests.js user-registration course-enrollment
```

The test runner includes:

- Environment validation
- Database connectivity checks
- Test database setup
- Comprehensive error reporting
- Performance monitoring

## Test Configuration

### Environment Variables

Create a `.env.test` file with the following variables:

```env
NODE_ENV=test

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=strellerminds_test

# JWT Configuration
JWT_SECRET=test-jwt-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=test-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1

# Payment Configuration (test/sandbox)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# Blockchain Configuration
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
```

### Jest Configuration

Integration tests use a specialized Jest configuration (`test/jest-integration.json`) with:

- Extended timeouts (60 seconds)
- Sequential test execution
- Comprehensive coverage reporting
- HTML and JUnit reporters
- Global setup and teardown

## Database Setup

### With PostgreSQL

If PostgreSQL is available, tests will:

1. Automatically create a test database
2. Run migrations and setup schemas
3. Clean up data between tests
4. Optionally drop the database after tests

### Without PostgreSQL

Tests can run with mocked database operations:

- Database calls are intercepted and mocked
- Test data is maintained in memory
- Full functionality testing without external dependencies

## Test Data Management

### Test Utilities

The test suite includes comprehensive utilities:

```typescript
// Global test utilities available in all tests
global.testUtils = {
  cleanupDatabase: () => Promise<void>,
  seedDatabase: (data) => Promise<void>,
  runInTransaction: (callback) => Promise<void>,
  generateTestEmail: (prefix?) => string,
  generateTestData: (type, overrides?) => object,
  delay: (ms) => Promise<void>,
  waitFor: (condition, timeout?) => Promise<boolean>,
};
```

### Data Factories

Test factories provide consistent test data:

```typescript
// User factory
const userData = global.testUtils.generateTestData('user', {
  email: 'custom@example.com',
  role: 'instructor',
});

// Course factory
const courseData = global.testUtils.generateTestData('course', {
  price: 199.99,
  level: 'advanced',
});
```

## Test Patterns and Best Practices

### Test Structure

Each test file follows a consistent structure:

```typescript
describe('Feature Integration Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    // Setup test module and application
  });

  afterAll(async () => {
    // Cleanup application
  });

  beforeEach(async () => {
    // Clean database and setup test data
  });

  describe('Specific Flow', () => {
    it('should handle happy path', async () => {
      // Test implementation
    });

    it('should handle error cases', async () => {
      // Error case testing
    });
  });
});
```

### Assertion Patterns

Use comprehensive assertions for integration tests:

```typescript
// Response structure validation
expect(response.body).toMatchObject({
  id: expect.any(String),
  email: expectedEmail,
  createdAt: expect.any(String),
});

// Database verification
const savedEntity = await repository.findOne({ where: { id } });
expect(savedEntity).toBeDefined();
expect(savedEntity.status).toBe('active');

// Event verification
expect(eventEmitter.emit).toHaveBeenCalledWith(
  'user.registered',
  expect.objectContaining({ userId: expect.any(String) }),
);
```

### Error Testing

Integration tests include comprehensive error scenarios:

```typescript
it('should handle network failures gracefully', async () => {
  // Simulate network failure
  jest.spyOn(httpService, 'post').mockRejectedValue(new Error('Network error'));

  const response = await request(app.getHttpServer())
    .post('/api/endpoint')
    .send(validData)
    .expect(503);

  expect(response.body.message).toContain('Service temporarily unavailable');
});
```

## Performance Testing

Integration tests include performance benchmarks:

```typescript
it('should handle high-load enrollment', async () => {
  const startTime = Date.now();

  const promises = Array.from({ length: 100 }, (_, i) =>
    enrollInCourse(courseId, `student${i}@example.com`),
  );

  const results = await Promise.allSettled(promises);
  const duration = Date.now() - startTime;

  expect(duration).toBeLessThan(30000); // 30 seconds max
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(100);
});
```

## Security Testing

Security validations are integrated throughout:

```typescript
it('should prevent SQL injection attacks', async () => {
  const maliciousInput = "'; DROP TABLE users; --";

  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ ...validData, firstName: maliciousInput })
    .expect(201);

  // Verify database integrity
  const userCount = await userRepository.count();
  expect(userCount).toBeGreaterThan(0); // Table should still exist
});
```

## Monitoring and Reporting

### Test Reports

Integration tests generate comprehensive reports:

- **HTML Report**: Visual test results with coverage
- **JUnit XML**: CI/CD integration format
- **Coverage Report**: Code coverage metrics
- **Performance Report**: Response time analysis

### Logging

Detailed logging is available for debugging:

```bash
# View test logs
cat logs/tests/integration-$(date +%Y-%m-%d).log

# Test summary
cat logs/tests/integration-summary.json
```

## Continuous Integration

### GitHub Actions Integration

The tests are designed for CI/CD pipelines:

```yaml
- name: Run Integration Tests
  run: |
    npm run test:integration
  env:
    NODE_ENV: test
    DB_HOST: localhost
    DB_USERNAME: postgres
    DB_PASSWORD: postgres
```

### Docker Support

Tests can run in containerized environments:

```bash
# Start test database
docker run --name postgres-test \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:13

# Run tests
npm run test:integration
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**

   ```bash
   # Check PostgreSQL status
   pg_isready -h localhost -p 5432

   # Start PostgreSQL
   brew services start postgresql  # macOS
   sudo service postgresql start  # Linux
   ```

2. **Port Conflicts**

   ```bash
   # Check for processes using ports
   lsof -i :5432  # PostgreSQL
   lsof -i :6379  # Redis
   ```

3. **Memory Issues**
   ```bash
   # Increase Node.js memory limit
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm run test:integration
   ```

### Debug Mode

Run tests in debug mode for detailed output:

```bash
# Enable debug logging
DEBUG=* npm run test:integration

# Run specific test with increased verbosity
npm run test:integration:user-registration -- --verbose
```

## Contributing

When adding new integration tests:

1. Follow the existing test structure and patterns
2. Include both happy path and error scenarios
3. Add performance and security validations
4. Update this documentation
5. Ensure tests are deterministic and can run in parallel

## Support

For questions or issues with integration tests:

1. Check the troubleshooting section above
2. Review test logs in `logs/tests/`
3. Run tests individually to isolate issues
4. Consult the team documentation or reach out to the development team
