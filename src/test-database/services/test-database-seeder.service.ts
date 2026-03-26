import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TestDatabaseService } from './test-database.service';
import { TestDataFactory } from '../factories/test-data.factory';
import { TestDataVersioningService } from './test-data-versioning.service';

export interface SeedOptions {
  version?: string;
  dataSet?: 'minimal' | 'standard' | 'full';
  reset?: boolean;
  isolate?: boolean;
  testId?: string;
}

export interface SeedResult {
  success: boolean;
  version?: string;
  testId?: string;
  entities: {
    users: number;
    courses: number;
    assignments: number;
    payments: number;
    forums: number;
  };
  errors: string[];
  duration: number;
}

@Injectable()
export class TestDatabaseSeeder {
  private readonly logger = new Logger(TestDatabaseSeeder.name);

  constructor(
    private readonly testDatabaseService: TestDatabaseService,
    private readonly testDataFactory: TestDataFactory,
    private readonly versioningService: TestDataVersioningService,
  ) {}

  /**
   * Seed test database with data
   */
  async seed(options: SeedOptions = {}): Promise<SeedResult> {
    const startTime = Date.now();
    const {
      version = '1.0.0',
      dataSet = 'standard',
      reset = false,
      isolate = false,
      testId,
    } = options;

    this.logger.log(`Starting test database seeding with dataset: ${dataSet}`);

    const result: SeedResult = {
      success: false,
      entities: {
        users: 0,
        courses: 0,
        assignments: 0,
        payments: 0,
        forums: 0,
      },
      errors: [],
      duration: 0,
    };

    try {
      // Initialize database connection
      await this.testDatabaseService.initialize();

      // Create test schema if isolation is requested
      if (isolate && testId) {
        await this.testDatabaseService.createTestSchema(testId);
        result.testId = testId;
      }

      // Reset database if requested
      if (reset) {
        await this.testDatabaseService.clearDatabase();
        this.logger.log('Database cleared for reseeding');
      }

      // Load or create version
      let versionData;
      try {
        versionData = await this.versioningService.loadVersion(version);
      } catch {
        // Create version if it doesn't exist
        versionData = await this.versioningService.createVersion(
          version,
          `Test data version ${version} for ${dataSet} dataset`,
        );
      }

      result.version = version;

      // Generate test data based on dataset size
      const dataCounts = this.getDataSetCounts(dataSet);
      const testData = await this.testDataFactory.createTestScenario(dataCounts);

      // Update result counts
      result.entities.users = testData.users.length;
      result.entities.courses = testData.courses.length;
      result.entities.assignments = testData.assignments.length;
      result.entities.payments = testData.payments.length;
      result.entities.forums = testData.forums.length;

      result.success = true;
      this.logger.log(`Test database seeded successfully with ${dataSet} dataset`);

    } catch (error) {
      result.errors.push(error.message);
      this.logger.error('Test database seeding failed:', error);
    } finally {
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Get entity counts for different dataset sizes
   */
  private getDataSetCounts(dataSet: 'minimal' | 'standard' | 'full') {
    switch (dataSet) {
      case 'minimal':
        return {
          userCount: 5,
          courseCount: 2,
          assignmentCount: 5,
          paymentCount: 3,
          forumCount: 1,
        };
      case 'standard':
        return {
          userCount: 20,
          courseCount: 8,
          assignmentCount: 25,
          paymentCount: 15,
          forumCount: 4,
        };
      case 'full':
        return {
          userCount: 50,
          courseCount: 20,
          assignmentCount: 60,
          paymentCount: 40,
          forumCount: 10,
        };
      default:
        return this.getDataSetCounts('standard');
    }
  }

  /**
   * Seed minimal test data
   */
  async seedMinimal(options: Partial<SeedOptions> = {}): Promise<SeedResult> {
    return this.seed({ ...options, dataSet: 'minimal' });
  }

  /**
   * Seed standard test data
   */
  async seedStandard(options: Partial<SeedOptions> = {}): Promise<SeedResult> {
    return this.seed({ ...options, dataSet: 'standard' });
  }

  /**
   * Seed full test data
   */
  async seedFull(options: Partial<SeedOptions> = {}): Promise<SeedResult> {
    return this.seed({ ...options, dataSet: 'full' });
  }

  /**
   * Seed with isolation for specific test
   */
  async seedForTest(testId: string, options: Partial<SeedOptions> = {}): Promise<SeedResult> {
    return this.seed({
      ...options,
      isolate: true,
      testId,
      reset: true, // Always reset when isolating
    });
  }

  /**
   * Re-seed existing data
   */
  async reseed(options: SeedOptions = {}): Promise<SeedResult> {
    return this.seed({ ...options, reset: true });
  }

  /**
   * Get seeding status
   */
  async getSeedingStatus(): Promise<{
    isConnected: boolean;
    hasData: boolean;
    currentVersion?: string;
    entityCounts: Record<string, number>;
  }> {
    try {
      const dataSource = this.testDatabaseService.getDataSource();
      const queryRunner = dataSource.createQueryRunner();

      const entityCounts: Record<string, number> = {};
      const tables = ['users', 'courses', 'assignments', 'payments', 'forums'];

      for (const table of tables) {
        try {
          const result = await queryRunner.query(`SELECT COUNT(*) as count FROM ${table}`);
          entityCounts[table] = result[0].count || 0;
        } catch {
          entityCounts[table] = 0;
        }
      }

      await queryRunner.release();

      const totalEntities = Object.values(entityCounts).reduce((sum, count) => sum + count, 0);
      const currentVersion = this.versioningService.getCurrentVersion();

      return {
        isConnected: dataSource.isInitialized,
        hasData: totalEntities > 0,
        currentVersion: currentVersion?.version,
        entityCounts,
      };
    } catch (error) {
      return {
        isConnected: false,
        hasData: false,
        entityCounts: {},
      };
    }
  }

  /**
   * Validate seeded data
   */
  async validateSeededData(): Promise<{
    valid: boolean;
    issues: string[];
    summary: {
      totalEntities: number;
      orphanedRecords: number;
      dataIntegrityIssues: number;
    };
  }> {
    const issues: string[] = [];
    const summary = {
      totalEntities: 0,
      orphanedRecords: 0,
      dataIntegrityIssues: 0,
    };

    try {
      const dataSource = this.testDatabaseService.getDataSource();
      const queryRunner = dataSource.createQueryRunner();

      // Check for orphaned records
      const orphanedChecks = [
        {
          query: `
            SELECT COUNT(*) as count 
            FROM enrollments e 
            LEFT JOIN users u ON e.student_id = u.id 
            WHERE u.id IS NULL
          `,
          description: 'Orphaned enrollments (missing users)',
        },
        {
          query: `
            SELECT COUNT(*) as count 
            FROM assignments a 
            LEFT JOIN users u ON a.instructor_id = u.id 
            WHERE u.id IS NULL
          `,
          description: 'Orphaned assignments (missing instructors)',
        },
        {
          query: `
            SELECT COUNT(*) as count 
            FROM payments p 
            LEFT JOIN users u ON p.user_id = u.id 
            WHERE u.id IS NULL
          `,
          description: 'Orphaned payments (missing users)',
        },
      ];

      for (const check of orphanedChecks) {
        try {
          const result = await queryRunner.query(check.query);
          const count = result[0].count || 0;
          if (count > 0) {
            issues.push(`${check.description}: ${count} records`);
            summary.orphanedRecords += count;
          }
        } catch (error) {
          issues.push(`Failed to check ${check.description}: ${error.message}`);
        }
      }

      // Count total entities
      const tables = ['users', 'courses', 'assignments', 'payments', 'forums'];
      for (const table of tables) {
        try {
          const result = await queryRunner.query(`SELECT COUNT(*) as count FROM ${table}`);
          summary.totalEntities += result[0].count || 0;
        } catch {
          // Table might not exist
        }
      }

      await queryRunner.release();

      summary.dataIntegrityIssues = issues.length;

      return {
        valid: issues.length === 0,
        issues,
        summary,
      };
    } catch (error) {
      issues.push(`Validation failed: ${error.message}`);
      return {
        valid: false,
        issues,
        summary,
      };
    }
  }

  /**
   * Cleanup test data for specific test
   */
  async cleanupTest(testId: string): Promise<boolean> {
    try {
      await this.testDatabaseService.dropTestSchema(testId);
      this.logger.log(`Cleaned up test data for test: ${testId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to cleanup test data for ${testId}:`, error);
      return false;
    }
  }
}
