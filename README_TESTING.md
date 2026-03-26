# Testing Guide for StrellerMinds-Backend

This guide provides comprehensive information about the testing infrastructure and how to run tests effectively.

## Overview

StrellerMinds-Backend implements a multi-layered testing strategy to ensure code quality, reliability, and maintainability:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions and data flows
- **E2E Tests**: Test complete user journeys
- **Performance Tests**: Test system performance under load
- **Security Tests**: Test for vulnerabilities and security issues

## Test Coverage

Current coverage metrics:
- **Overall Coverage**: 80%+ ✅
- **Unit Tests**: 85%+ ✅
- **Integration Tests**: 80%+ ✅
- **E2E Tests**: Critical paths 100% ✅

## Running Tests

### Prerequisites

Ensure you have the following installed:
- Node.js 18.x or higher
- npm or yarn
- Docker (for integration tests)
- PostgreSQL (for local testing)
- Redis (for local testing)

### Environment Setup

1. Install dependencies:
```bash
npm install
```

2. Set up test environment:
```bash
cp .env.example .env.test
# Edit .env.test with your test database credentials
```

3. Start test services:
```bash
docker-compose -f docker-compose.test.yml up -d
```

### Test Commands

#### Unit Tests
```bash
# Run all unit tests
npm run test

# Run with coverage
npm run test:cov

# Run in watch mode
npm run test:watch

# Run specific test file
npm run test -- user.service.spec.ts
```

#### Integration Tests
```bash
# Run all integration tests
npm run test:integration

# Run with coverage
npm run test:integration:cov

# Run in watch mode
npm run test:integration:watch

# Run specific integration test
npm run test:integration -- user-workflow.integration.spec.ts
```

#### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run specific E2E test
npm run test:e2e -- --spec "user-journey.cy.ts"

# Run in headed mode (with browser UI)
npm run test:e2e:headed
```

#### Performance Tests
```bash
# Run load tests
npm run perf:load

# Run stress tests
npm run perf:stress

# Run performance benchmarks
npm run perf:benchmark
```

#### Security Tests
```bash
# Run security audit
npm run audit:security

# Run security scan
npm run security:scan

# Run OWASP ZAP scan
npm run security:zap
```

## Test Structure

### Unit Tests
Location: `src/**/*.spec.ts`

Structure:
```
src/
├── user/
│   ├── user.service.spec.ts
│   └── user.controller.spec.ts
├── payment/
│   └── services/
│       └── stripe.service.spec.ts
└── analytics/
    └── services/
        └── analytics.service.spec.ts
```

### Integration Tests
Location: `test/integration/`

Structure:
```
test/integration/
├── user-workflow.integration.spec.ts
├── paypal.integration.spec.ts
└── stripe.integration.spec.ts
```

### E2E Tests
Location: `cypress/e2e/`

Structure:
```
cypress/e2e/
├── user-journey.cy.ts
├── admin-workflow.cy.ts
└── payment-flow.cy.ts
```

## Writing Tests

### Unit Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { Repository } from 'typeorm';

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            // ... other methods
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should create user successfully', async () => {
    const createUserDto = {
      email: 'test@example.com',
      password: 'Password123!',
      // ... other fields
    };

    const expectedUser = { id: '1', ...createUserDto };
    userRepository.save.mockResolvedValue(expectedUser as User);

    const result = await service.create(createUserDto);

    expect(result).toEqual(expectedUser);
    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining(createUserDto)
    );
  });
});
```

### Integration Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('User Workflow Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should complete user registration flow', async () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'Password123!',
      // ... other fields
    };

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    expect(response.body.user.email).toBe(registerDto.email);
    // ... more assertions
  });
});
```

### E2E Test Example

```typescript
describe('User Registration', () => {
  it('should register new user successfully', () => {
    cy.visit('/register');
    
    cy.get('[data-cy=email-input]').type('test@example.com');
    cy.get('[data-cy=password-input]').type('Password123!');
    cy.get('[data-cy=confirm-password-input]').type('Password123!');
    cy.get('[data-cy=register-button]').click();
    
    cy.url().should('include', '/dashboard');
    cy.get('[data-cy=welcome-message]').should('be.visible');
  });
});
```

## Test Data Management

### Fixtures
Test fixtures are located in `test/fixtures/`:

```typescript
// test/fixtures/user.fixture.ts
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  password: 'hashedPassword',
  // ... other fields
};
```

### Factories
Use factories for generating test data:

```typescript
// test/factories/user.factory.ts
export class UserFactory {
  static create(overrides: Partial<User> = {}): User {
    return {
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      ...overrides,
    };
  }
}
```

### Database Cleanup
Tests automatically clean up after themselves:
- Unit tests use mocked repositories
- Integration tests use transactions that are rolled back
- E2E tests use dedicated test database

## Coverage Reports

### Generating Reports
```bash
# Generate comprehensive coverage report
npm run coverage:report

# Generate coverage badge
npm run coverage:badge
```

### Viewing Reports
- **HTML Report**: Open `coverage/lcov-report/index.html`
- **JSON Summary**: View `coverage/coverage-summary.json`
- **Detailed Report**: View `coverage/detailed-report.md`

### Coverage Thresholds
Current thresholds are set in `jest.config.js`:
- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

## CI/CD Integration

### GitHub Actions
Tests run automatically on:
- Every push to main/develop branches
- Every pull request
- Nightly builds

### Quality Gates
PRs must pass:
- All unit tests (80%+ coverage)
- All integration tests
- All E2E tests (for critical paths)
- Security audit
- Performance benchmarks

### Coverage Reporting
Coverage reports are automatically:
- Generated on test runs
- Uploaded to Codecov
- Displayed in PR comments
- Tracked over time

## Best Practices

### Unit Testing
1. **Test behavior, not implementation**
2. **Use descriptive test names**
3. **Arrange, Act, Assert pattern**
4. **Mock external dependencies**
5. **Test edge cases and error conditions**

### Integration Testing
1. **Test component interactions**
2. **Use real databases (test instances)**
3. **Test API contracts**
4. **Validate data flow**
5. **Test error scenarios**

### E2E Testing
1. **Test user journeys**
2. **Use realistic test data**
3. **Test across browsers**
4. **Include mobile testing**
5. **Test accessibility**

### General Testing
1. **Keep tests independent**
2. **Use consistent naming conventions**
3. **Document complex test scenarios**
4. **Regular maintenance and updates**
5. **Monitor test performance**

## Troubleshooting

### Common Issues

#### Tests Fail Due to Database Connection
```bash
# Ensure test database is running
docker-compose -f docker-compose.test.yml ps

# Reset test database
npm run test:db:reset
```

#### Coverage Below Threshold
```bash
# Generate detailed coverage report
npm run coverage:report

# Check uncovered files
cat coverage/coverage-summary.json | grep -E '"pct":\s*[0-7][0-9]'
```

#### E2E Tests Flaky
```bash
# Run with longer timeout
CYPRESS_DEFAULT_COMMAND_TIMEOUT=10000 npm run test:e2e

# Run in headed mode for debugging
npm run test:e2e:headed
```

#### Integration Tests Slow
```bash
# Use in-memory SQLite for faster tests
TEST_DB_TYPE=sqlite npm run test:integration
```

### Debugging Tips

1. **Use console.log sparingly** - prefer test assertions
2. **Run tests in isolation** to identify failing tests
3. **Check test logs** for detailed error information
4. **Use browser dev tools** for E2E debugging
5. **Profile test performance** to identify bottlenecks

## Contributing

When adding new features:

1. **Write tests first** (TDD approach)
2. **Ensure 80%+ coverage** for new code
3. **Add integration tests** for new endpoints
4. **Include E2E tests** for user-facing features
5. **Update documentation**

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)
- [Cypress Documentation](https://docs.cypress.io/guides/overview/why-cypress)
- [Codecov Documentation](https://docs.codecov.com/docs)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## Support

For testing-related questions:
1. Check this documentation
2. Review existing test files for examples
3. Check GitHub Issues
4. Contact the development team

---

This testing guide ensures that all team members can effectively contribute to and maintain the high-quality test suite for StrellerMinds-Backend.
