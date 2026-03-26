import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { TestDataManager } from './test-data-manager';
import { TestDataCleanup } from './test-data-cleanup';
import { TestDataVersioning } from './test-data-versioning';
import { TestDataIsolation, IsolationConfig } from './test-data-isolation';

export interface TestSetupConfig {
  isolation?: IsolationConfig;
  cleanup?: boolean;
  version?: string;
  dataset?: 'minimal' | 'standard' | 'full';
  autoCleanup?: boolean;
  cleanupTimeout?: number;
}

export interface TestEnvironment {
  testDataManager: TestDataManager;
  testDataCleanup: TestDataCleanup;
  testDataVersioning: TestDataVersioning;
  testDataIsolation: TestDataIsolation;
  dataSource: DataSource;
}

/**
 * Comprehensive test setup utility
 * 
 * Provides a unified interface for all test data management features:
 * - Test data creation and management
 * - Cleanup and isolation
 * - Versioning and migrations
 * - Environment setup and teardown
 */
export class TestSetup {
  private readonly logger = new Logger(TestSetup.name);
  private environment: TestEnvironment | null = null;

  constructor(private dataSource: DataSource) {}

  /**
   * Initialize test environment
   */
  async initialize(config: TestSetupConfig = {}): Promise<TestEnvironment> {
    this.logger.log('🚀 Initializing test environment...');

    const environment: TestEnvironment = {
      testDataManager: new TestDataManager(this.dataSource),
      testDataCleanup: new TestDataCleanup(this.dataSource),
      testDataVersioning: new TestDataVersioning(this.dataSource),
      testDataIsolation: new TestDataIsolation(this.dataSource),
      dataSource: this.dataSource,
    };

    // Apply version if specified
    if (config.version) {
      await environment.testDataVersioning.applyVersion(config.version);
    }

    this.environment = environment;
    this.logger.log('✅ Test environment initialized');

    return environment;
  }

  /**
   * Setup test with isolation and data
   */
  async setupTest(
    testId: string,
    config: TestSetupConfig = {}
  ): Promise<{
    environment: TestEnvironment;
    testData: any;
    context: any;
  }> {
    if (!this.environment) {
      throw new Error('Test environment not initialized. Call initialize() first.');
    }

    this.logger.log(`🔧 Setting up test: ${testId}`);

    // Create isolation context
    const context = await this.environment.testDataIsolation.createContext(testId, config.isolation);

    // Create test data
    const testData = await this.environment.testDataManager.createTestData(testId, {
      isolation: true,
      cleanup: config.cleanup !== false,
      version: config.version,
      dataset: config.dataset || 'minimal',
      transaction: config.isolation?.isolationLevel === 'transaction',
    });

    // Setup auto-cleanup if requested
    if (config.autoCleanup !== false) {
      this.setupAutoCleanup(testId, config.cleanupTimeout);
    }

    this.logger.log(`✅ Test setup completed for: ${testId}`);

    return {
      environment: this.environment,
      testData,
      context,
    };
  }

  /**
   * Execute test with full setup and teardown
   */
  async executeTest<T>(
    testId: string,
    testFn: (env: TestEnvironment, testData: any) => Promise<T>,
    config: TestSetupConfig = {}
  ): Promise<T> {
    return await this.environment!.testDataIsolation.executeWithIsolation(
      testId,
      async () => {
        const { environment, testData } = await this.setupTest(testId, {
          ...config,
          autoCleanup: false, // Handle cleanup manually
        });

        try {
          const result = await testFn(environment, testData);
          return result;
        } finally {
          if (config.cleanup !== false) {
            await environment.testDataCleanup.cleanByTestSession(testId);
          }
        }
      },
      config.isolation
    );
  }

  /**
   * Cleanup test
   */
  async cleanupTest(testId: string): Promise<void> {
    if (!this.environment) {
      return;
    }

    this.logger.log(`🧹 Cleaning up test: ${testId}`);

    try {
      // Cleanup isolation context
      await this.environment.testDataIsolation.cleanupContext(testId);

      // Cleanup test data
      await this.environment.testDataManager.cleanupTestData(testId);

      this.logger.log(`✅ Test cleanup completed for: ${testId}`);
    } catch (error) {
      this.logger.error(`❌ Test cleanup failed for ${testId}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup all tests
   */
  async cleanupAllTests(): Promise<void> {
    if (!this.environment) {
      return;
    }

    this.logger.log('🧹 Cleaning up all tests...');

    try {
      // Cleanup all isolation contexts
      await this.environment.testDataIsolation.cleanupAllContexts();

      // Cleanup all test data
      await this.environment.testDataManager.cleanupAllTestData();

      // Clean orphaned records
      await this.environment.testDataCleanup.cleanOrphanedRecords();

      this.logger.log('✅ All tests cleanup completed');
    } catch (error) {
      this.logger.error('❌ All tests cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Get current environment
   */
  getEnvironment(): TestEnvironment | null {
    return this.environment;
  }

  /**
   * Create test data snapshot
   */
  async createSnapshot(name: string, description?: string): Promise<string> {
    if (!this.environment) {
      throw new Error('Test environment not initialized');
    }

    this.logger.log(`📸 Creating test data snapshot: ${name}`);

    const version = `snapshot-${name}-${Date.now()}`;
    await this.environment.testDataVersioning.createVersion(
      version,
      description || `Test data snapshot: ${name}`
    );

    return version;
  }

  /**
   * Restore from snapshot
   */
  async restoreSnapshot(version: string): Promise<void> {
    if (!this.environment) {
      throw new Error('Test environment not initialized');
    }

    this.logger.log(`🔄 Restoring from snapshot: ${version}`);

    await this.environment.testDataVersioning.applyVersion(version);
  }

  /**
   * Get test statistics
   */
  async getTestStats(): Promise<{
    isolation: any;
    cleanup: any;
    versions: any;
  }> {
    if (!this.environment) {
      throw new Error('Test environment not initialized');
    }

    return {
      isolation: this.environment.testDataIsolation.getIsolationStats(),
      cleanup: await this.environment.testDataCleanup.getCleanupStats(),
      versions: await this.environment.testDataVersioning.listVersions(),
    };
  }

  /**
   * Setup auto-cleanup with timeout
   */
  private setupAutoCleanup(testId: string, timeout?: number): void {
    const cleanupTimeout = timeout || 30000; // 30 seconds default

    setTimeout(() => {
      this.cleanupTest(testId).catch(error => {
        this.logger.error(`❌ Auto-cleanup failed for ${testId}:`, error);
      });
    }, cleanupTimeout);
  }

  /**
   * Validate test setup
   */
  async validateSetup(): Promise<boolean> {
    if (!this.environment) {
      return false;
    }

    try {
      // Test database connection
      await this.dataSource.query('SELECT 1');

      // Test basic operations
      const stats = await this.environment.testDataCleanup.getCleanupStats();
      
      this.logger.log('✅ Test setup validation passed');
      return true;
    } catch (error) {
      this.logger.error('❌ Test setup validation failed:', error);
      return false;
    }
  }

  /**
   * Reset test environment
   */
  async reset(): Promise<void> {
    this.logger.log('🔄 Resetting test environment...');

    try {
      await this.cleanupAllTests();
      this.environment = null;
      this.logger.log('✅ Test environment reset completed');
    } catch (error) {
      this.logger.error('❌ Test environment reset failed:', error);
      throw error;
    }
  }
}

/**
 * Jest test setup helper
 */
export class JestTestHelper {
  private testSetup: TestSetup;

  constructor(dataSource: DataSource) {
    this.testSetup = new TestSetup(dataSource);
  }

  /**
   * Setup before all tests
   */
  async beforeAll(config: TestSetupConfig = {}): Promise<TestEnvironment> {
    return await this.testSetup.initialize(config);
  }

  /**
   * Setup before each test
   */
  async beforeEach(testId: string, config: TestSetupConfig = {}): Promise<{
    environment: TestEnvironment;
    testData: any;
    context: any;
  }> {
    return await this.testSetup.setupTest(testId, config);
  }

  /**
   * Cleanup after each test
   */
  async afterEach(testId: string): Promise<void> {
    await this.testSetup.cleanupTest(testId);
  }

  /**
   * Cleanup after all tests
   */
  async afterAll(): Promise<void> {
    await this.testSetup.reset();
  }

  /**
   * Execute isolated test
   */
  async runTest<T>(
    testId: string,
    testFn: (env: TestEnvironment, testData: any) => Promise<T>,
    config: TestSetupConfig = {}
  ): Promise<T> {
    return await this.testSetup.executeTest(testId, testFn, config);
  }
}
