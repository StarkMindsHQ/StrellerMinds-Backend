import { Test, TestingModule } from '@nestjs/testing';
import { TestDatabaseModule } from '../test-database.module';
import { TestDatabaseService } from '../services/test-database.service';
import { TestDataFactory } from '../factories/test-data.factory';
import { TestDataManager } from '../services/test-data-manager.service';
import { TestDataCleanupService } from '../services/test-data-cleanup.service';
import { TestDataVersioningService } from '../services/test-data-versioning.service';
import { TestDatabaseSeeder } from '../services/test-database-seeder.service';

export interface TestContext {
  module: TestingModule;
  testDatabaseService: TestDatabaseService;
  testDataFactory: TestDataFactory;
  testDataManager: TestDataManager;
  testDataCleanupService: TestDataCleanupService;
  testDataVersioningService: TestDataVersioningService;
  testDatabaseSeeder: TestDatabaseSeeder;
  testId: string;
}

/**
 * Setup test database for unit tests
 */
export async function setupTestDatabase(options: {
  testId?: string;
  isolate?: boolean;
  seedData?: 'minimal' | 'standard' | 'full';
  reset?: boolean;
} = {}): Promise<TestContext> {
  const testId = options.testId || `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const moduleBuilder = Test.createTestingModule({
    imports: [TestDatabaseModule],
  });

  // Override configuration for testing
  moduleBuilder.overrideProvider('ConfigService').useValue({
    get: (key: string) => {
      const testConfig = {
        NODE_ENV: 'test',
        TEST_DB_HOST: 'localhost',
        TEST_DB_PORT: 5433,
        TEST_DB_USERNAME: 'test_user',
        TEST_DB_PASSWORD: 'test_password',
        TEST_DB_NAME: 'strellerminds_test',
      };
      return testConfig[key];
    },
  });

  const module = await moduleBuilder.compile();

  const testDatabaseService = module.get<TestDatabaseService>(TestDatabaseService);
  const testDataFactory = module.get<TestDataFactory>(TestDataFactory);
  const testDataManager = module.get<TestDataManager>(TestDataManager);
  const testDataCleanupService = module.get<TestDataCleanupService>(TestDataCleanupService);
  const testDataVersioningService = module.get<TestDataVersioningService>(TestDataVersioningService);
  const testDatabaseSeeder = module.get<TestDatabaseSeeder>(TestDatabaseSeeder);

  // Initialize database
  await testDatabaseService.initialize();

  // Create isolated schema if requested
  if (options.isolate) {
    await testDatabaseService.createTestSchema(testId);
  }

  // Reset database if requested
  if (options.reset) {
    await testDatabaseService.clearDatabase();
  }

  // Seed data if requested
  if (options.seedData) {
    await testDatabaseSeeder.seed({
      dataSet: options.seedData,
      isolate: options.isolate,
      testId: options.isolate ? testId : undefined,
    });
  }

  return {
    module,
    testDatabaseService,
    testDataFactory,
    testDataManager,
    testDataCleanupService,
    testDataVersioningService,
    testDatabaseSeeder,
    testId,
  };
}

/**
 * Cleanup test database after tests
 */
export async function cleanupTestDatabase(context: TestContext): Promise<void> {
  try {
    // Drop test schema if isolation was used
    if (context.testId) {
      await context.testDatabaseService.dropTestSchema(context.testId);
    }

    // Close database connection
    await context.testDatabaseService.close();

    // Close testing module
    await context.module.close();
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
}

/**
 * Create test data with automatic cleanup
 */
export async function withTestData<T>(
  testFn: (context: TestContext) => Promise<T>,
  options: {
    testId?: string;
    isolate?: boolean;
    seedData?: 'minimal' | 'standard' | 'full';
    reset?: boolean;
  } = {},
): Promise<T> {
  let context: TestContext;

  try {
    context = await setupTestDatabase(options);
    return await testFn(context);
  } finally {
    if (context) {
      await cleanupTestDatabase(context);
    }
  }
}

/**
 * Create isolated test environment
 */
export async function createIsolatedTest(
  testName: string,
  testFn: (context: TestContext) => Promise<void>,
  seedData: 'minimal' | 'standard' | 'full' = 'minimal',
): Promise<void> {
  await withTestData(
    async (context) => {
      console.log(`Running isolated test: ${testName}`);
      await testFn(context);
      console.log(`Completed isolated test: ${testName}`);
    },
    {
      testId: testName,
      isolate: true,
      seedData,
      reset: true,
    },
  );
}

/**
 * Setup test with specific data set
 */
export async function setupWithDataSet<T>(
  dataSetName: string,
  testFn: (context: TestContext, dataSet: any) => Promise<T>,
): Promise<T> {
  return withTestData(async (context) => {
    // Create or load data set
    let dataSet = context.testDataManager.getDataSet(dataSetName);
    
    if (!dataSet) {
      dataSet = await context.testDataManager.createDataSet(dataSetName, {
        size: 'standard',
      });
    }

    return testFn(context, dataSet);
  });
}

/**
 * Performance test helper
 */
export async function runPerformanceTest<T>(
  testName: string,
  testFn: (context: TestContext) => Promise<T>,
  iterations: number = 1,
): Promise<{
  testName: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  results: T[];
}> {
  const results: T[] = [];
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    const result = await withTestData(testFn, {
      testId: `${testName}_iteration_${i}`,
      isolate: true,
      seedData: 'minimal',
      reset: true,
    });
    results.push(result);
  }

  const totalTime = Date.now() - startTime;
  const averageTime = totalTime / iterations;

  return {
    testName,
    iterations,
    totalTime,
    averageTime,
    results,
  };
}

/**
 * Database transaction test helper
 */
export async function withTransaction<T>(
  context: TestContext,
  transactionFn: (queryRunner: any) => Promise<T>,
): Promise<T> {
  const dataSource = context.testDatabaseService.getDataSource();
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const result = await transactionFn(queryRunner);
    await queryRunner.commitTransaction();
    return result;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Mock data generator for specific test scenarios
 */
export class MockDataGenerator {
  constructor(private context: TestContext) {}

  /**
   * Generate user authentication scenario
   */
  async generateAuthScenario() {
    const admin = await this.context.testDataFactory.users.createAdmin();
    const instructor = await this.context.testDataFactory.users.createInstructor();
    const student = await this.context.testDataFactory.users.createStudent();
    const unverifiedUser = await this.context.testDataFactory.users.createUnverified();
    const suspendedUser = await this.context.testDataFactory.users.createSuspended();

    return {
      admin,
      instructor,
      student,
      unverifiedUser,
      suspendedUser,
    };
  }

  /**
   * Generate course enrollment scenario
   */
  async generateEnrollmentScenario() {
    const instructor = await this.context.testDataFactory.users.createInstructor();
    const students = await this.context.testDataFactory.users.createStudents(5);
    
    const course = await this.context.testDataFactory.courses.create({
      instructorId: instructor.id,
      isPublished: true,
    });

    return {
      instructor,
      students,
      course,
    };
  }

  /**
   * Generate payment scenario
   */
  async generatePaymentScenario() {
    const student = await this.context.testDataFactory.users.createStudent();
    const course = await this.context.testDataFactory.courses.create({
      price: 99.99,
      isPublished: true,
    });

    const completedPayment = await this.context.testDataFactory.payments.createCompleted({
      userId: student.id,
      amount: 99.99,
    });

    const pendingPayment = await this.context.testDataFactory.payments.createPending({
      userId: student.id,
      amount: 49.99,
    });

    const failedPayment = await this.context.testDataFactory.payments.createFailed({
      userId: student.id,
      amount: 29.99,
    });

    return {
      student,
      course,
      completedPayment,
      pendingPayment,
      failedPayment,
    };
  }

  /**
   * Generate assignment scenario
   */
  async generateAssignmentScenario() {
    const instructor = await this.context.testDataFactory.users.createInstructor();
    const students = await this.context.testDataFactory.users.createStudents(3);
    
    const course = await this.context.testDataFactory.courses.create({
      instructorId: instructor.id,
    });

    const quiz = await this.context.testDataFactory.assignments.createQuiz({
      courseId: course.id,
      instructorId: instructor.id,
    });

    const project = await this.context.testDataFactory.assignments.createProject({
      courseId: course.id,
      instructorId: instructor.id,
    });

    const exam = await this.context.testDataFactory.assignments.createExam({
      courseId: course.id,
      instructorId: instructor.id,
    });

    return {
      instructor,
      students,
      course,
      quiz,
      project,
      exam,
    };
  }
}
