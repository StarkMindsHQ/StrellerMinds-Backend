import { setupTestDatabase, cleanupTestDatabase, TestContext } from '../utils/test-setup';

// Global test context
let testContext: TestContext | null = null;

/**
 * Global test setup for Jest
 */
beforeAll(async () => {
  // Setup test database for all tests
  testContext = await setupTestDatabase({
    testId: 'global_test_suite',
    isolate: true,
    seedData: 'minimal',
    reset: true,
  });
});

/**
 * Global test cleanup for Jest
 */
afterAll(async () => {
  if (testContext) {
    await cleanupTestDatabase(testContext);
    testContext = null;
  }
});

/**
 * Setup for each test file
 */
beforeEach(async () => {
  // Clear any test-specific data between tests
  if (testContext) {
    await testContext.testDatabaseService.clearDatabase();
  }
});

/**
 * Get global test context
 */
export function getTestContext(): TestContext {
  if (!testContext) {
    throw new Error('Test context not initialized. Make sure to run tests with Jest setup.');
  }
  return testContext;
}

/**
 * Helper function for tests that need isolated data
 */
export async function withIsolatedData<T>(
  testFn: (context: TestContext) => Promise<T>,
  seedData: 'minimal' | 'standard' | 'full' = 'minimal',
): Promise<T> {
  const context = getTestContext();
  
  // Clear existing data
  await context.testDatabaseService.clearDatabase();
  
  // Seed fresh data
  await context.testDatabaseSeeder.seed({
    dataSet: seedData,
    isolate: false, // Already in isolated schema
  });
  
  return testFn(context);
}

/**
 * Helper function for tests that need specific entities
 */
export async function withEntities<T>(
  entityConfig: {
    users?: number;
    courses?: number;
    assignments?: number;
    payments?: number;
    forums?: number;
  },
  testFn: (context: TestContext, entities: any) => Promise<T>,
): Promise<T> {
  const context = getTestContext();
  
  // Clear existing data
  await context.testDatabaseService.clearDatabase();
  
  // Create specific entities
  const entities = await context.testDataFactory.createTestScenario(entityConfig);
  
  return testFn(context, entities);
}

/**
 * Mock data generator for tests
 */
export function createMockDataGenerator() {
  const context = getTestContext();
  return new (require('../utils/test-setup')).MockDataGenerator(context);
}

/**
 * Test timeout configuration
 */
jest.setTimeout(30000); // 30 seconds default timeout

/**
 * Console override to reduce noise in tests
 */
const originalConsole = global.console;

beforeEach(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: originalConsole.error, // Keep errors for debugging
  };
});

afterEach(() => {
  global.console = originalConsole;
});

/**
 * Global test utilities
 */
global.testUtils = {
  getTestContext,
  withIsolatedData,
  withEntities,
  createMockDataGenerator,
};
