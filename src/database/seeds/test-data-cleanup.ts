import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';

/**
 * Test data cleanup service
 * 
 * Provides comprehensive cleanup mechanisms for test data including:
 * - Automatic cleanup after tests
 * - Selective cleanup by entity type
 * - Cleanup by test session
 * - Cleanup with cascading deletes
 * - Cleanup with performance monitoring
 */
export class TestDataCleanup {
  private readonly logger = new Logger(TestDataCleanup.name);

  constructor(private dataSource: DataSource) {}

  /**
   * Clean all test data from database
   */
  async cleanAllTestData(): Promise<void> {
    this.logger.log('🧹 Starting complete test data cleanup...');
    const startTime = Date.now();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Cleanup in correct order to respect foreign key constraints
      const cleanupSteps = [
        { table: 'forum_posts', description: 'forum posts' },
        { table: 'forum_topics', description: 'forum topics' },
        { table: 'enrollments', description: 'enrollments' },
        { table: 'gamification_profiles', description: 'gamification profiles' },
        { table: 'payments', description: 'payments' },
        { table: 'assignments', description: 'assignments' },
        { table: 'courses', description: 'courses' },
        { table: 'users', description: 'users' },
      ];

      for (const step of cleanupSteps) {
        this.logger.log(`Cleaning ${step.description}...`);
        await queryRunner.query(`DELETE FROM ${step.table}`);
      }

      await queryRunner.commitTransaction();
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Complete cleanup finished in ${duration}ms`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('❌ Cleanup failed:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Clean specific entity types
   */
  async cleanEntityTypes(entityTypes: string[]): Promise<void> {
    this.logger.log(`🧹 Cleaning specific entity types: ${entityTypes.join(', ')}`);
    const startTime = Date.now();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const entityType of entityTypes) {
        const tableName = this.getTableName(entityType);
        if (tableName) {
          this.logger.log(`Cleaning ${tableName}...`);
          await queryRunner.query(`DELETE FROM ${tableName}`);
        } else {
          this.logger.warn(`Unknown entity type: ${entityType}`);
        }
      }

      await queryRunner.commitTransaction();
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Selective cleanup finished in ${duration}ms`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('❌ Selective cleanup failed:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Clean data by test session ID
   */
  async cleanByTestSession(sessionId: string): Promise<void> {
    this.logger.log(`🧹 Cleaning data for test session: ${sessionId}`);
    const startTime = Date.now();

    try {
      // Check if entities have session_id column
      const entitiesWithSession = [
        'users', 'courses', 'payments', 'enrollments', 
        'gamification_profiles', 'assignments', 'forum_posts', 'forum_topics'
      ];

      for (const entity of entitiesWithSession) {
        const hasSessionColumn = await this.checkColumnExists(entity, 'session_id');
        if (hasSessionColumn) {
          await this.dataSource.query(`DELETE FROM ${entity} WHERE session_id = ?`, [sessionId]);
          this.logger.log(`Cleaned ${entity} for session ${sessionId}`);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Session cleanup finished in ${duration}ms`);
    } catch (error) {
      this.logger.error(`❌ Session cleanup failed for ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Clean data older than specified date
   */
  async cleanOldData(olderThan: Date): Promise<void> {
    this.logger.log(`🧹 Cleaning data older than: ${olderThan.toISOString()}`);
    const startTime = Date.now();

    try {
      const entitiesWithCreatedAt = [
        'users', 'courses', 'payments', 'enrollments', 
        'gamification_profiles', 'assignments', 'forum_posts', 'forum_topics'
      ];

      for (const entity of entitiesWithCreatedAt) {
        const hasCreatedAtColumn = await this.checkColumnExists(entity, 'created_at');
        if (hasCreatedAtColumn) {
          await this.dataSource.query(
            `DELETE FROM ${entity} WHERE created_at < ?`, 
            [olderThan.toISOString()]
          );
          this.logger.log(`Cleaned old data from ${entity}`);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Old data cleanup finished in ${duration}ms`);
    } catch (error) {
      this.logger.error('❌ Old data cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Clean orphaned records (records with invalid foreign keys)
   */
  async cleanOrphanedRecords(): Promise<void> {
    this.logger.log('🧹 Cleaning orphaned records...');
    const startTime = Date.now();

    try {
      // Clean orphaned enrollments
      await this.dataSource.query(`
        DELETE FROM enrollments 
        WHERE user_id NOT IN (SELECT id FROM users) 
        OR course_id NOT IN (SELECT id FROM courses)
      `);

      // Clean orphaned payments
      await this.dataSource.query(`
        DELETE FROM payments 
        WHERE user_id NOT IN (SELECT id FROM users) 
        OR course_id NOT IN (SELECT id FROM courses)
      `);

      // Clean orphaned gamification profiles
      await this.dataSource.query(`
        DELETE FROM gamification_profiles 
        WHERE user_id NOT IN (SELECT id FROM users)
      `);

      // Clean orphaned forum posts
      await this.dataSource.query(`
        DELETE FROM forum_posts 
        WHERE author_id NOT IN (SELECT id FROM users)
        OR (course_id IS NOT NULL AND course_id NOT IN (SELECT id FROM courses))
      `);

      // Clean orphaned forum topics
      await this.dataSource.query(`
        DELETE FROM forum_topics 
        WHERE course_id IS NOT NULL AND course_id NOT IN (SELECT id FROM courses)
      `);

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Orphaned records cleanup finished in ${duration}ms`);
    } catch (error) {
      this.logger.error('❌ Orphaned records cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Reset database sequences (for PostgreSQL)
   */
  async resetSequences(): Promise<void> {
    this.logger.log('🔄 Resetting database sequences...');
    
    try {
      if (this.dataSource.options.type === 'postgres') {
        const sequences = await this.dataSource.query(`
          SELECT sequence_name 
          FROM information_schema.sequences 
          WHERE sequence_schema = 'public'
        `);

        for (const seq of sequences) {
          await this.dataSource.query(`ALTER SEQUENCE ${seq.sequence_name} RESTART WITH 1`);
        }

        this.logger.log(`✅ Reset ${sequences.length} sequences`);
      }
    } catch (error) {
      this.logger.warn('⚠️ Could not reset sequences:', error.message);
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{ [key: string]: number }> {
    const stats: { [key: string]: number } = {};

    try {
      const tables = [
        'users', 'courses', 'payments', 'enrollments', 
        'gamification_profiles', 'assignments', 'forum_posts', 'forum_topics'
      ];

      for (const table of tables) {
        const result = await this.dataSource.query(`SELECT COUNT(*) as count FROM ${table}`);
        stats[table] = parseInt(result[0].count);
      }
    } catch (error) {
      this.logger.error('❌ Failed to get cleanup stats:', error);
    }

    return stats;
  }

  /**
   * Check if column exists in table
   */
  private async checkColumnExists(table: string, column: string): Promise<boolean> {
    try {
      if (this.dataSource.options.type === 'postgres') {
        const result = await this.dataSource.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = ? AND column_name = ?
          )
        `, [table, column]);
        return result[0].exists;
      } else if (this.dataSource.options.type === 'sqlite') {
        const result = await this.dataSource.query(`PRAGMA table_info(${table})`);
        return result.some((col: any) => col.name === column);
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get table name for entity type
   */
  private getTableName(entityType: string): string | null {
    const tableMap: { [key: string]: string } = {
      'user': 'users',
      'users': 'users',
      'course': 'courses',
      'courses': 'courses',
      'payment': 'payments',
      'payments': 'payments',
      'enrollment': 'enrollments',
      'enrollments': 'enrollments',
      'gamification': 'gamification_profiles',
      'gamificationProfile': 'gamification_profiles',
      'gamificationProfiles': 'gamification_profiles',
      'assignment': 'assignments',
      'assignments': 'assignments',
      'forumPost': 'forum_posts',
      'forumPosts': 'forum_posts',
      'forumTopic': 'forum_topics',
      'forumTopics': 'forum_topics',
    };

    return tableMap[entityType] || null;
  }
}
