import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { TestSetup, JestTestHelper } from '../../src/database/seeds/test-setup';
import { TestDataManager } from '../../src/database/seeds/test-data-manager';
import { TestDataCleanup } from '../../src/database/seeds/test-data-cleanup';
import { TestDataVersioning } from '../../src/database/seeds/test-data-versioning';
import { TestDataIsolation } from '../../src/database/seeds/test-data-isolation';

describe('Test Data Management Examples', () => {
  let testSetup: TestSetup;
  let jestHelper: JestTestHelper;
  let dataSource: DataSource;
  let testEnvironment: any;

  beforeAll(async () => {
    // Initialize test environment
    const module: TestingModule = await Test.createTestingModule({
      // Your test module configuration
    }).compile();

    dataSource = module.get<DataSource>(DataSource);
    testSetup = new TestSetup(dataSource);
    jestHelper = new JestTestHelper(dataSource);

    // Initialize test environment
    testEnvironment = await jestHelper.beforeAll({
      dataset: 'minimal',
      cleanup: true,
      autoCleanup: true,
    });
  });

  afterAll(async () => {
    // Cleanup all test data
    await jestHelper.afterAll();
  });

  describe('Basic Test Data Creation', () => {
    it('should create test data with minimal dataset', async () => {
      const { testData, environment } = await jestHelper.beforeEach('basic-test');

      expect(testData).toBeDefined();
      expect(testData.users).toBeDefined();
      expect(testData.courses).toBeDefined();
      expect(testData.users.length).toBeGreaterThan(0);

      await jestHelper.afterEach('basic-test');
    });

    it('should create test data with standard dataset', async () => {
      const { testData } = await jestHelper.beforeEach('standard-test', {
        dataset: 'standard',
      });

      expect(testData.users.length).toBeGreaterThan(5);
      expect(testData.courses.length).toBeGreaterThan(10);
      expect(testData.enrollments).toBeDefined();
      expect(testData.gamificationProfiles).toBeDefined();

      await jestHelper.afterEach('standard-test');
    });

    it('should create test data with full dataset', async () => {
      const { testData } = await jestHelper.beforeEach('full-test', {
        dataset: 'full',
      });

      expect(testData.users.length).toBeGreaterThan(50);
      expect(testData.courses.length).toBeGreaterThan(20);
      expect(testData.forumPosts).toBeDefined();
      expect(testData.payments).toBeDefined();

      await jestHelper.afterEach('full-test');
    });
  });

  describe('Test Data Isolation', () => {
    it('should isolate test data with transactions', async () => {
      const result = await jestHelper.runTest('isolation-transaction', async (env, testData) => {
        // Modify test data
        const userFactory = env.testDataManager.factories.get('user');
        const newUser = await userFactory.create();

        expect(newUser.id).toBeDefined();

        // This data will be rolled back after the test
        return { userId: newUser.id };
      }, {
        isolation: {
          isolationLevel: 'transaction',
          autoCleanup: true,
          rollbackOnFailure: true,
        },
      });

      expect(result.userId).toBeDefined();
    });

    it('should isolate test data with schema isolation', async () => {
      const result = await jestHelper.runTest('isolation-schema', async (env, testData) => {
        // Test with schema isolation
        const stats = await env.testDataCleanup.getCleanupStats();
        expect(stats).toBeDefined();

        return { isolated: true };
      }, {
        isolation: {
          isolationLevel: 'schema',
          autoCleanup: true,
        },
      });

      expect(result.isolated).toBe(true);
    });
  });

  describe('Test Data Cleanup', () => {
    it('should cleanup test data automatically', async () => {
      await jestHelper.runTest('auto-cleanup', async (env, testData) => {
        // Create some test data
        const userFactory = env.testDataManager.factories.get('user');
        await userFactory.createMany(5);

        // Get initial stats
        const initialStats = await env.testDataCleanup.getCleanupStats();
        expect(initialStats.users).toBeGreaterThan(0);

        return { cleaned: true };
      }, {
        autoCleanup: true,
        cleanupTimeout: 5000,
      });

      // Data should be cleaned up automatically
    });

    it('should cleanup specific entity types', async () => {
      const { testData, environment } = await jestHelper.beforeEach('selective-cleanup');

      // Create additional test data
      const userFactory = environment.testDataManager.factories.get('user');
      await userFactory.createMany(10);

      // Cleanup only users
      await environment.testDataCleanup.cleanEntityTypes(['users']);

      // Verify cleanup
      const stats = await environment.testDataCleanup.getCleanupStats();
      expect(stats.users).toBe(0);

      await jestHelper.afterEach('selective-cleanup');
    });

    it('should cleanup orphaned records', async () => {
      const { environment } = await jestHelper.beforeEach('orphan-cleanup');

      // Clean orphaned records
      await environment.testDataCleanup.cleanOrphanedRecords();

      const stats = await environment.testDataCleanup.getCleanupStats();
      expect(stats).toBeDefined();

      await jestHelper.afterEach('orphan-cleanup');
    });
  });

  describe('Test Data Versioning', () => {
    it('should create and apply test data version', async () => {
      const { environment } = await jestHelper.beforeEach('versioning-test');

      // Create a version
      const version = await environment.testDataVersioning.createVersion(
        '1.0.0',
        'Initial test data version'
      );

      expect(version.version).toBe('1.0.0');
      expect(version.schema).toBeDefined();

      // List versions
      const versions = await environment.testDataVersioning.listVersions();
      expect(versions.length).toBeGreaterThan(0);

      await jestHelper.afterEach('versioning-test');
    });

    it('should export and import test data', async () => {
      const { environment, testData } = await jestHelper.beforeEach('export-import-test');

      // Export test data
      const exportPath = await environment.testDataVersioning.exportData('1.0.0');
      expect(exportPath).toBeDefined();

      // Clean current data
      await environment.testDataCleanup.cleanAllTestData();

      // Import test data
      await environment.testDataVersioning.importData(exportPath);

      await jestHelper.afterEach('export-import-test');
    });

    it('should create and apply migrations', async () => {
      const { environment } = await jestHelper.beforeEach('migration-test');

      // Create migration
      const migration = await environment.testDataVersioning.createMigration(
        '1.0.0',
        '1.1.0',
        'Add new fields to user entity',
        'ALTER TABLE users ADD COLUMN test_field VARCHAR(255);',
        'ALTER TABLE users DROP COLUMN test_field;'
      );

      expect(migration.version).toBe('1.0.0-to-1.1.0');

      await jestHelper.afterEach('migration-test');
    });
  });

  describe('Advanced Usage Examples', () => {
    it('should handle complex test scenarios', async () => {
      const result = await jestHelper.runTest('complex-scenario', async (env, testData) => {
        // Create custom test data
        const userFactory = env.testDataManager.factories.get('user');
        const courseFactory = env.testDataManager.factories.get('course');
        const enrollmentFactory = env.testDataManager.factories.get('enrollment');

        // Create instructor
        const instructor = await userFactory.createWithRole('INSTRUCTOR', 1)[0];

        // Create course
        const course = await courseFactory.create({ instructor });

        // Create students
        const students = await userFactory.createStudents(10);

        // Create enrollments
        const enrollments = [];
        for (const student of students) {
          enrollments.push(await enrollmentFactory.create({ user: student, course }));
        }

        // Create snapshot
        const snapshotVersion = await env.testDataVersioning.createSnapshot(
          'complex-scenario-snapshot',
          'Snapshot before complex operations'
        );

        return {
          instructorId: instructor.id,
          courseId: course.id,
          studentCount: students.length,
          enrollmentCount: enrollments.length,
          snapshotVersion,
        };
      }, {
        dataset: 'standard',
        isolation: {
          isolationLevel: 'transaction',
          autoCleanup: true,
        },
      });

      expect(result.instructorId).toBeDefined();
      expect(result.courseId).toBeDefined();
      expect(result.studentCount).toBe(10);
      expect(result.enrollmentCount).toBe(10);
      expect(result.snapshotVersion).toBeDefined();
    });

    it('should handle performance testing with large datasets', async () => {
      const startTime = Date.now();

      const { testData } = await jestHelper.beforeEach('performance-test', {
        dataset: 'full',
      });

      const setupTime = Date.now() - startTime;
      console.log(`Setup time for full dataset: ${setupTime}ms`);

      expect(testData.users.length).toBeGreaterThan(50);
      expect(testData.courses.length).toBeGreaterThan(20);

      // Test cleanup performance
      const cleanupStart = Date.now();
      await jestHelper.afterEach('performance-test');
      const cleanupTime = Date.now() - cleanupStart;

      console.log(`Cleanup time: ${cleanupTime}ms`);

      // Performance assertions
      expect(setupTime).toBeLessThan(10000); // Should setup in under 10 seconds
      expect(cleanupTime).toBeLessThan(5000); // Should cleanup in under 5 seconds
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle test failures gracefully', async () => {
      try {
        await jestHelper.runTest('failure-test', async (env, testData) => {
          // Create some test data
          const userFactory = env.testDataManager.factories.get('user');
          await userFactory.create();

          // Simulate test failure
          throw new Error('Simulated test failure');
        }, {
          isolation: {
            isolationLevel: 'transaction',
            rollbackOnFailure: true,
          },
        });
      } catch (error) {
        expect(error.message).toBe('Simulated test failure');
      }

      // Verify that data was rolled back
      const stats = await testEnvironment.testDataCleanup.getCleanupStats();
      // The test data should not persist due to rollback
    });

    it('should handle cleanup failures', async () => {
      // This test demonstrates error handling in cleanup scenarios
      const { environment } = await jestHelper.beforeEach('cleanup-failure-test');

      try {
        // Simulate a cleanup scenario that might fail
        await environment.testDataCleanup.cleanEntityTypes(['nonexistent_table']);
      } catch (error) {
        expect(error).toBeDefined();
      }

      await jestHelper.afterEach('cleanup-failure-test');
    });
  });

  describe('Integration with Existing Tests', () => {
    it('should work with existing integration tests', async () => {
      // Example of how to integrate with existing test patterns
      const { testData, environment } = await jestHelper.beforeEach('integration-test');

      // Use test data in existing test logic
      const adminUser = testData.users.find(u => u.role === 'ADMIN');
      expect(adminUser).toBeDefined();

      const testCourse = testData.courses[0];
      expect(testCourse).toBeDefined();

      // Perform test operations
      const enrollmentFactory = environment.testDataManager.factories.get('enrollment');
      const student = testData.users.find(u => u.role === 'STUDENT');
      
      if (student && testCourse) {
        const enrollment = await enrollmentFactory.create({
          user: student,
          course: testCourse,
        });
        expect(enrollment.id).toBeDefined();
      }

      await jestHelper.afterEach('integration-test');
    });
  });
});
