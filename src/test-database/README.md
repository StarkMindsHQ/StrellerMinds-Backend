# Test Data Management System

A comprehensive test data management system for the StrellerMinds Backend that provides reliable, maintainable, and isolated test data for unit tests, integration tests, and end-to-end tests.

## Features

- **Test Data Factories**: Generate realistic test data with customizable options
- **Database Seeding**: Populate test database with different dataset sizes (minimal, standard, full)
- **Data Isolation**: Each test runs in isolated schema to prevent interference
- **Automatic Cleanup**: Clean up test data after test completion
- **Data Versioning**: Track and manage different versions of test data
- **Performance Optimization**: Efficient data generation and cleanup processes

## Installation

The test data management system is included in the `src/test-database` module. Import it in your test files:

```typescript
import { 
  TestDatabaseModule, 
  TestDataFactory, 
  TestDataManager,
  setupTestDatabase,
  cleanupTestDatabase 
} from '../test-database';
```

## Quick Start

### Basic Test Setup

```typescript
import { setupTestDatabase, cleanupTestDatabase } from '../test-database/utils/test-setup';

describe('MyService', () => {
  let testContext;

  beforeAll(async () => {
    testContext = await setupTestDatabase({
      testId: 'my_service_test',
      isolate: true,
      seedData: 'minimal',
      reset: true,
    });
  });

  afterAll(async () => {
    await cleanupTestDatabase(testContext);
  });

  it('should work with test data', async () => {
    const user = await testContext.testDataFactory.users.createStudent();
    // Your test logic here
  });
});
```

### Using Test Data Factories

```typescript
// Create users
const admin = await testContext.testDataFactory.users.createAdmin();
const instructors = await testContext.testDataFactory.users.createInstructors(5);
const students = await testContext.testDataFactory.users.createStudents(20);

// Create courses
const courses = await testContext.testDataFactory.courses.createMany(10, {
  instructorIds: instructors.map(i => i.id),
});

// Create assignments
const assignments = await testContext.testDataFactory.assignments.createMany(25, {
  courseIds: courses.map(c => c.id),
});
```

### Mock Data Scenarios

```typescript
import { MockDataGenerator } from '../test-database/utils/test-setup';

const mockGenerator = new MockDataGenerator(testContext);

// Generate authentication scenario
const authScenario = await mockGenerator.generateAuthScenario();
// Returns: { admin, instructor, student, unverifiedUser, suspendedUser }

// Generate course enrollment scenario
const enrollmentScenario = await mockGenerator.generateEnrollmentScenario();
// Returns: { instructor, students, course }

// Generate payment scenario
const paymentScenario = await mockGenerator.generatePaymentScenario();
// Returns: { student, course, completedPayment, pendingPayment, failedPayment }
```

## API Reference

### TestDatabaseModule

Main module that provides all test data management services.

```typescript
@Module({
  imports: [TestDatabaseModule],
  providers: [MyService],
})
export class MyTestModule {}
```

### TestDataFactory

Central factory for creating test data.

#### Users

```typescript
// Create individual users
const admin = await testDataFactory.users.createAdmin();
const instructor = await testDataFactory.users.createInstructor();
const student = await testDataFactory.users.createStudent();

// Create multiple users
const instructors = await testDataFactory.users.createInstructors(5);
const students = await testDataFactory.users.createStudents(20);

// Create users with custom options
const customUser = await testDataFactory.users.create({
  email: 'custom@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: UserRole.INSTRUCTOR,
});
```

#### Courses

```typescript
// Create individual courses
const course = await testDataFactory.courses.create({
  title: 'JavaScript Fundamentals',
  instructorId: instructor.id,
  isPublished: true,
});

// Create multiple courses
const courses = await testDataFactory.courses.createMany(10, {
  instructorIds: instructors.map(i => i.id),
});

// Create specific course types
const publishedCourse = await testDataFactory.courses.createPublished();
const draftCourse = await testDataFactory.courses.createDraft();
const freeCourse = await testDataFactory.courses.createFree();
```

#### Assignments

```typescript
// Create assignments
const assignment = await testDataFactory.assignments.create({
  title: 'JavaScript Quiz',
  courseId: course.id,
  type: 'quiz',
});

// Create specific assignment types
const quiz = await testDataFactory.assignments.createQuiz();
const project = await testDataFactory.assignments.createProject();
const exam = await testDataFactory.assignments.createExam();
```

#### Payments

```typescript
// Create payments
const payment = await testDataFactory.payments.create({
  userId: student.id,
  amount: 99.99,
  status: 'completed',
});

// Create specific payment types
const completedPayment = await testDataFactory.payments.createCompleted();
const pendingPayment = await testDataFactory.payments.createPending();
const failedPayment = await testDataFactory.payments.createFailed();
```

### TestDataManager

Manage test data sets and caching.

```typescript
// Create data set
const dataSet = await testDataManager.createDataSet('integration_test', {
  description: 'Data for integration tests',
  size: 'standard',
  userCount: 50,
  courseCount: 20,
});

// Get cached data set
const cachedDataSet = testDataManager.getDataSet('integration_test');

// Export/import data sets
const jsonExport = testDataManager.exportDataSet('integration_test');
await testDataManager.importDataSet(jsonExport);
```

### TestDataCleanupService

Clean up test data after tests.

```typescript
// Clean up all data
await testDataCleanupService.cleanupAll();

// Clean up specific entity types
await testDataCleanupService.cleanup({
  preserveUsers: true,
  preserveCourses: false,
});

// Clean up old data
await testDataCleanupService.cleanupOlderThan(7); // 7 days

// Dry run (without actually deleting)
const result = await testDataCleanupService.cleanupAll({ dryRun: true });
```

### TestDataVersioningService

Manage versions of test data.

```typescript
// Create version
await versioningService.createVersion('1.0.0', 'Initial test data version', {
  schema: { entities: ['users', 'courses'], relationships: ['user_courses'] },
});

// Load version
await versioningService.loadVersion('1.0.0');

// Compare versions
const diff = await versioningService.compareVersions('1.0.0', '1.1.0');

// Tag version
await versioningService.tagVersion('1.0.0', 'stable');
```

### TestDatabaseSeeder

Seed database with test data.

```typescript
// Seed with different dataset sizes
await testDatabaseSeeder.seedMinimal();
await testDatabaseSeeder.seedStandard();
await testDatabaseSeeder.seedFull();

// Seed for specific test
await testDatabaseSeeder.seedForTest('my_test', {
  dataSet: 'minimal',
  isolate: true,
});

// Get seeding status
const status = await testDatabaseSeeder.getSeedingStatus();
```

## Configuration

### Environment Variables

```bash
# Database Configuration
TEST_DB_HOST=localhost
TEST_DB_PORT=5433
TEST_DB_USERNAME=test_user
TEST_DB_PASSWORD=test_password
TEST_DB_NAME=strellerminds_test

# Test Data Configuration
TEST_DEFAULT_DATA_SET=standard
TEST_ISOLATION_ENABLED=true
TEST_AUTO_CLEANUP=true
TEST_VERSIONING_ENABLED=true
TEST_MAX_DURATION=30
TEST_SEED_TIMEOUT=60
TEST_CLEANUP_TIMEOUT=30
```

### Jest Configuration

Update your `jest.config.js` to include the test setup:

```javascript
module.exports = {
  // ... other config
  setupFilesAfterEnv: ['<rootDir>/src/test-database/jest/test-setup.jest.ts'],
  testTimeout: 30000,
};
```

## Best Practices

### 1. Test Isolation

Always use isolated test environments to prevent test interference:

```typescript
beforeAll(async () => {
  testContext = await setupTestDatabase({
    isolate: true, // Always isolate tests
    reset: true,  // Always start with clean state
  });
});
```

### 2. Data Size

Use appropriate dataset sizes for different test types:

- **Unit Tests**: Use `minimal` dataset
- **Integration Tests**: Use `standard` dataset  
- **E2E Tests**: Use `full` dataset

### 3. Cleanup

Always clean up after tests:

```typescript
afterAll(async () => {
  await cleanupTestDatabase(testContext);
});
```

### 4. Mock Data Scenarios

Use mock data generators for consistent test scenarios:

```typescript
const authScenario = await mockGenerator.generateAuthScenario();
// Provides consistent set of users for auth tests
```

### 5. Performance

- Use data caching for expensive operations
- Clean up data between tests to prevent bloat
- Use appropriate timeouts for seeding operations

## Examples

See the `examples/` directory for complete test examples:

- `auth.service.test.ts` - Authentication service tests
- `course.service.test.ts` - Course service tests

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure test database is running
   - Check environment variables
   - Verify database credentials

2. **Test Timeout**
   - Increase test timeout in Jest config
   - Check seeding timeout configuration
   - Optimize data generation

3. **Memory Issues**
   - Use dataset isolation
   - Clean up data between tests
   - Monitor memory usage

4. **Data Inconsistency**
   - Use data versioning
   - Validate seeded data
   - Check foreign key constraints

### Debug Mode

Enable debug logging:

```typescript
process.env.TEST_DB_LOGGING = 'true';
```

## Contributing

When adding new test data factories:

1. Extend `BaseFactory` class
2. Implement required methods (`create`, `generate`, `getRepository`)
3. Add factory to `TestDataFactory`
4. Update documentation
5. Add examples and tests

## License

This test data management system is part of the StrellerMinds Backend project.
