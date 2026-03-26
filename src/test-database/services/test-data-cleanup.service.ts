import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TestDatabaseService } from './test-database.service';

export interface CleanupOptions {
  preserveUsers?: boolean;
  preserveCourses?: boolean;
  preserveAssignments?: boolean;
  preservePayments?: boolean;
  preserveForums?: boolean;
  olderThan?: Date;
  dryRun?: boolean;
}

@Injectable()
export class TestDataCleanupService {
  private readonly logger = new Logger(TestDataCleanupService.name);

  constructor(private readonly testDatabaseService: TestDatabaseService) {}

  /**
   * Clean up test data based on options
   */
  async cleanup(options: CleanupOptions = {}): Promise<{
    deletedRecords: Record<string, number>;
    errors: string[];
  }> {
    const {
      preserveUsers = false,
      preserveCourses = false,
      preserveAssignments = false,
      preservePayments = false,
      preserveForums = false,
      olderThan,
      dryRun = false,
    } = options;

    this.logger.log(`Starting test data cleanup${dryRun ? ' (dry run)' : ''}`);

    const dataSource = this.testDatabaseService.getDataSource();
    const deletedRecords: Record<string, number> = {};
    const errors: string[] = [];

    try {
      // Define cleanup order (respecting foreign key constraints)
      const cleanupSteps = [
        { table: 'forum_posts', preserve: preserveForums },
        { table: 'forum_threads', preserve: preserveForums },
        { table: 'forums', preserve: preserveForums },
        { table: 'assignment_submissions', preserve: preserveAssignments },
        { table: 'assignment_attempts', preserve: preserveAssignments },
        { table: 'assignments', preserve: preserveAssignments },
        { table: 'payments', preserve: preservePayments },
        { table: 'enrollments', preserve: preserveCourses },
        { table: 'course_content', preserve: preserveCourses },
        { table: 'courses', preserve: preserveCourses },
        { table: 'user_activities', preserve: preserveUsers },
        { table: 'gamification_profiles', preserve: preserveUsers },
        { table: 'refresh_tokens', preserve: preserveUsers },
        { table: 'users', preserve: preserveUsers },
      ];

      for (const step of cleanupSteps) {
        if (step.preserve) {
          this.logger.log(`Skipping ${step.table} (preserve flag set)`);
          continue;
        }

        try {
          const deletedCount = await this.cleanupTable(
            dataSource,
            step.table,
            olderThan,
            dryRun,
          );
          deletedRecords[step.table] = deletedCount;
          
          if (!dryRun) {
            this.logger.log(`Deleted ${deletedCount} records from ${step.table}`);
          } else {
            this.logger.log(`Would delete ${deletedCount} records from ${step.table}`);
          }
        } catch (error) {
          const errorMsg = `Failed to cleanup ${step.table}: ${error.message}`;
          errors.push(errorMsg);
          this.logger.error(errorMsg);
        }
      }

      this.logger.log(`Test data cleanup completed${dryRun ? ' (dry run)' : ''}`);
      
      return { deletedRecords, errors };
    } catch (error) {
      this.logger.error('Test data cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Clean up a specific table
   */
  private async cleanupTable(
    dataSource: DataSource,
    tableName: string,
    olderThan?: Date,
    dryRun: boolean = false,
  ): Promise<number> {
    const queryRunner = dataSource.createQueryRunner();

    try {
      let query = `DELETE FROM ${tableName}`;
      const params: any[] = [];

      if (olderThan) {
        query += ' WHERE created_at < $1';
        params.push(olderThan);
      }

      if (dryRun) {
        // For dry run, count instead of delete
        const countQuery = query.replace('DELETE', 'SELECT COUNT(*)');
        const result = await queryRunner.query(countQuery, params);
        return result[0].count || 0;
      } else {
        const result = await queryRunner.query(query, params);
        return result || 0;
      }
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Clean up test data older than specified number of days
   */
  async cleanupOlderThan(days: number, options: Partial<CleanupOptions> = {}): Promise<any> {
    const olderThan = new Date();
    olderThan.setDate(olderThan.getDate() - days);

    return this.cleanup({
      ...options,
      olderThan,
    });
  }

  /**
   * Clean up all test data (complete reset)
   */
  async cleanupAll(dryRun: boolean = false): Promise<any> {
    return this.cleanup({
      preserveUsers: false,
      preserveCourses: false,
      preserveAssignments: false,
      preservePayments: false,
      preserveForums: false,
      dryRun,
    });
  }

  /**
   * Clean up only user-related test data
   */
  async cleanupUserData(dryRun: boolean = false): Promise<any> {
    return this.cleanup({
      preserveUsers: false,
      preserveCourses: true,
      preserveAssignments: true,
      preservePayments: true,
      preserveForums: true,
      dryRun,
    });
  }

  /**
   * Clean up only course-related test data
   */
  async cleanupCourseData(dryRun: boolean = false): Promise<any> {
    return this.cleanup({
      preserveUsers: true,
      preserveCourses: false,
      preserveAssignments: true,
      preservePayments: true,
      preserveForums: true,
      dryRun,
    });
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStatistics(): Promise<Record<string, number>> {
    const dataSource = this.testDatabaseService.getDataSource();
    const queryRunner = dataSource.createQueryRunner();

    try {
      const tables = [
        'users', 'courses', 'assignments', 'payments', 'forums',
        'enrollments', 'gamification_profiles', 'user_activities',
        'refresh_tokens', 'forum_threads', 'forum_posts',
        'assignment_submissions', 'assignment_attempts', 'course_content',
      ];

      const statistics: Record<string, number> = {};

      for (const table of tables) {
        try {
          const result = await queryRunner.query(`SELECT COUNT(*) as count FROM ${table}`);
          statistics[table] = result[0].count || 0;
        } catch (error) {
          statistics[table] = 0;
        }
      }

      return statistics;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Validate cleanup safety before execution
   */
  async validateCleanup(options: CleanupOptions): Promise<{
    safe: boolean;
    warnings: string[];
    affectedRecords: Record<string, number>;
  }> {
    const statistics = await this.getCleanupStatistics();
    const warnings: string[] = [];
    const affectedRecords: Record<string, number> = {};

    // Check for critical data
    if (!options.preserveUsers && statistics.users > 0) {
      warnings.push(`This will delete ${statistics.users} user records`);
      affectedRecords.users = statistics.users;
    }

    if (!options.preserveCourses && statistics.courses > 0) {
      warnings.push(`This will delete ${statistics.courses} course records`);
      affectedRecords.courses = statistics.courses;
    }

    if (!options.preserveAssignments && statistics.assignments > 0) {
      warnings.push(`This will delete ${statistics.assignments} assignment records`);
      affectedRecords.assignments = statistics.assignments;
    }

    if (!options.preservePayments && statistics.payments > 0) {
      warnings.push(`This will delete ${statistics.payments} payment records`);
      affectedRecords.payments = statistics.payments;
    }

    if (!options.preserveForums && statistics.forums > 0) {
      warnings.push(`This will delete ${statistics.forums} forum records`);
      affectedRecords.forums = statistics.forums;
    }

    return {
      safe: warnings.length === 0,
      warnings,
      affectedRecords,
    };
  }
}
