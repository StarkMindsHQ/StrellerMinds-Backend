# Comprehensive Testing Guide

This document outlines the comprehensive testing strategy and practices used in the StrellerMinds Backend project.

## Overview

Our testing strategy follows a multi-layered approach to ensure code quality, reliability, and performance:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions and API endpoints
- **End-to-End Tests**: Test complete user workflows
- **Performance Tests**: Test system performance under load
- **Security Tests**: Test for vulnerabilities and security issues
- **Accessibility Tests**: Test for accessibility compliance
- **Visual Tests**: Test for visual regressions

## Test Structure

```
test/
├── unit/                    # Unit tests
│   ├── auth/               # Authentication tests
│   ├── users/              # User management tests
│   ├── courses/            # Course management tests
│   ├── video-streaming/    # Video streaming tests
│   └── utils/              # Utility function tests
├── integration/            # Integration tests
│   ├── auth/               # Auth API integration tests
│   ├── courses/            # Course API integration tests
│   └── video-streaming/    # Video streaming integration tests
├── e2e/                    # End-to-end tests
│   ├── specs/              # Test specifications
│   │   ├── auth/           # Authentication flows
│   │   ├── courses/        # Course management flows
│   │   ├── video/          # Video streaming flows
│   │   ├── accessibility/  # Accessibility tests
│   │   └── visual/         # Visual regression tests
│   ├── support/            # Test support files
│   ├── fixtures/           # Test data fixtures
│   └── screenshots/        # Visual test screenshots
├── factories/              # Test data factories
├── fixtures/               # Static test data
├── utils/                  # Test utilities and helpers
├── setup/                  # Test setup and configuration
└── reports/                # Test reports and coverage
```

## Running Tests

### Basic Commands

- `npm test` - Run all unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage
- `npm run test:unit` - Run only unit tests
- `npm run test:integration` - Run only integration tests
- `npm run test:e2e` - Run Jest E2E tests
- `npm run test:cypress` - Run Cypress E2E tests
- `npm run test:all` - Run all test suites

### Advanced Commands

- `npm run test:cypress:open` - Open Cypress test runner
- `npm run test:cypress:ci` - Run Cypress tests in CI mode
- `npm run test:visual` - Run visual regression tests
- `npm run test:a11y` - Run accessibility tests
- `npm run test:mutation` - Run mutation tests
- `npm run test:report` - Generate comprehensive test report
- `npm run test:ci` - Run full CI test suite

## Testing Patterns

### Unit Testing

Unit tests focus on testing individual components in isolation. We use Jest as our testing framework with comprehensive mocking.

#### Example Unit Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { userFactory } from '../../test/factories';

describe('UserService', () => {
  let service: UserService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: global.testUtils.createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = userFactory.build();
      const createdUser = userFactory.create();

      jest.spyOn(repository, 'create').mockReturnValue(createdUser);
      jest.spyOn(repository, 'save').mockResolvedValue(createdUser);

      const result = await service.create(userData);

      expect(result).toEqual(createdUser);
      expect(repository.create).toHaveBeenCalledWith(userData);
      expect(repository.save).toHaveBeenCalledWith(createdUser);
    });
  });
});
```

### Integration Testing

Integration tests verify that different components work together correctly, including API endpoints and database operations.

#### Example Integration Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { userFactory } from '../../test/factories';
import { DatabaseTestModule } from '../../test/utils/database-test.module';

describe('Auth Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [DatabaseTestModule, AuthModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await global.testUtils.cleanupDatabase();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const userData = userFactory.build();

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        access_token: expect.any(String),
        user: expect.objectContaining({
          email: userData.email,
        }),
      });
    });
  });
});
```

### End-to-End Testing

E2E tests verify complete user workflows using Cypress for browser automation.

#### Example E2E Test

```typescript
describe('User Registration Flow', () => {
  beforeEach(() => {
    cy.clearDatabase();
    cy.visit('/register');
  });

  it('should register a new user successfully', () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    cy.fillForm(userData);
    cy.get('[data-cy=register-button]').click();

    cy.checkToast('Registration successful', 'success');
    cy.url().should('include', '/dashboard');
    cy.get('[data-cy=user-menu]').should('be.visible');
  });
});
```

### Test Data Management

We use factories to generate consistent test data across all test types.

#### Using Factories

```typescript
import { userFactory, courseFactory } from '../factories';

// Create single instances
const user = userFactory.create();
const course = courseFactory.create();

// Create with traits
const admin = userFactory.admin();
const premiumCourse = courseFactory.premium();

// Create with overrides
const specificUser = userFactory.create({
  overrides: { email: 'specific@example.com' },
});

// Create multiple instances
const users = userFactory.createMany(5);
const courses = courseFactory.createCatalog(10);

// Create test scenarios
const scenario = testData.scenarios.learningPlatform();
```

### Performance Testing

Performance tests ensure the system can handle expected load and identify bottlenecks.

#### Load Testing with Artillery

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: 'Warm up'
    - duration: 120
      arrivalRate: 50
      name: 'Load test'

scenarios:
  - name: 'API Load Test'
    flow:
      - post:
          url: '/auth/login'
          json:
            email: '{{ $randomEmail() }}'
            password: 'password123'
      - get:
          url: '/courses'
```

### Accessibility Testing

Accessibility tests ensure our application is usable by everyone.

```typescript
describe('Accessibility Tests', () => {
  it('should be accessible', () => {
    cy.visit('/login');
    cy.checkA11y();
  });

  it('should support keyboard navigation', () => {
    cy.visit('/login');
    cy.get('body').tab();
    cy.focused().should('have.attr', 'data-cy', 'email-input');
  });
});
```

### Visual Regression Testing

Visual tests catch unintended UI changes.

```typescript
describe('Visual Tests', () => {
  it('should match login page design', () => {
    cy.visit('/login');
    cy.visualSnapshot('login-page');
  });

  it('should be responsive', () => {
    cy.visit('/dashboard');
    cy.checkResponsive(['mobile', 'tablet', 'desktop']);
  });
});
```

### Unit Tests

- Test individual components in isolation
- Use mocks for dependencies
- Focus on business logic
- One test file per component

### Integration Tests

- Test component interactions
- Use test database
- Mock external services

### E2E Tests

- Test complete flows
- Use test database
- Test API endpoints

#### E2E Tests Setup

- Test files: `*.e2e-spec.ts` in `test/e2e/`
- `.env.test`: defines DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, STELLAR_NETWORK
- Global setup/teardown (`jest.global-setup.ts` / `jest.global-teardown.ts`) to reset and teardown test database
- `tsconfig.e2e.json`: extends base `tsconfig.json`, includes `node` and `jest` types
- `jest-e2e.json`: configured with `globalSetup`, `globalTeardown`, and `ts-jest` pointing to `tsconfig.e2e.json`
- CI Workflow: `.github/workflows/e2e.yml` runs E2E tests on push/pull_request to main

## Best Practices

1. **Arrange-Act-Assert**: Structure tests in three parts
   - Arrange: Set up test data and conditions
   - Act: Execute the code being tested
   - Assert: Verify the results

2. **Naming Conventions**
   - Test files: `*.spec.ts` for unit tests, `*.e2e-spec.ts` for E2E tests
   - Test descriptions should clearly state what is being tested

3. **Mocking**
   - Use Jest's mock functions for dependencies
   - Create reusable mock factories
   - Mock external services and databases

4. **Coverage**
   - Aim for high coverage but focus on critical paths
   - Use coverage reports to identify untested code

## Example Test

```typescript
import { Test } from '@nestjs/testing';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserService],
    }).compile();

    service = module.get(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

## Test Utilities

Common test utilities are available in the `test/utils` directory:

- Mock factories
- Test data generators
- Common test setup functions
