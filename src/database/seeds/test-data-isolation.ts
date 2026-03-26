import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';

export interface IsolationContext {
  testId: string;
  sessionId: string;
  userId?: string;
  timestamp: Date;
  isolationLevel: 'transaction' | 'schema' | 'database';
}

export interface IsolationConfig {
  isolationLevel: 'transaction' | 'schema' | 'database';
  autoCleanup: boolean;
  timeoutMs?: number;
  rollbackOnFailure: boolean;
}

/**
 * Test data isolation system
 * 
 * Provides comprehensive isolation for test data including:
 * - Transaction-level isolation
 * - Schema-level isolation
 * - Database-level isolation
 * - Automatic cleanup
 * - Context management
 * - Performance monitoring
 */
export class TestDataIsolation {
  private readonly logger = new Logger(TestDataIsolation.name);
  private readonly activeContexts = new Map<string, IsolationContext>();
  private readonly contextTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(private dataSource: DataSource) {}

  /**
   * Create isolation context for a test
   */
  async createContext(
    testId: string,
    config: IsolationConfig = {
      isolationLevel: 'transaction',
      autoCleanup: true,
      rollbackOnFailure: true,
    }
  ): Promise<IsolationContext> {
    const sessionId = this.generateSessionId();
    const context: IsolationContext = {
      testId,
      sessionId,
      timestamp: new Date(),
      isolationLevel: config.isolationLevel,
    };

    this.logger.log(`🔒 Creating isolation context for test: ${testId} (${config.isolationLevel})`);

    try {
      switch (config.isolationLevel) {
        case 'transaction':
          await this.createTransactionIsolation(context);
          break;
        case 'schema':
          await this.createSchemaIsolation(context);
          break;
        case 'database':
          await this.createDatabaseIsolation(context);
          break;
      }

      this.activeContexts.set(testId, context);

      // Set timeout for auto-cleanup
      if (config.timeoutMs) {
        const timeout = setTimeout(() => {
          this.cleanupContext(testId);
        }, config.timeoutMs);
        this.contextTimeouts.set(testId, timeout);
      }

      this.logger.log(`✅ Isolation context created for test: ${testId}`);
      return context;
    } catch (error) {
      this.logger.error(`❌ Failed to create isolation context for ${testId}:`, error);
      throw error;
    }
  }

  /**
   * Get isolation context
   */
  getContext(testId: string): IsolationContext | undefined {
    return this.activeContexts.get(testId);
  }

  /**
   * Clean up isolation context
   */
  async cleanupContext(testId: string): Promise<void> {
    this.logger.log(`🧹 Cleaning up isolation context for test: ${testId}`);

    const context = this.activeContexts.get(testId);
    if (!context) {
      this.logger.warn(`No active context found for test: ${testId}`);
      return;
    }

    try {
      switch (context.isolationLevel) {
        case 'transaction':
          await this.cleanupTransactionIsolation(context);
          break;
        case 'schema':
          await this.cleanupSchemaIsolation(context);
          break;
        case 'database':
          await this.cleanupDatabaseIsolation(context);
          break;
      }

      // Clear timeout
      const timeout = this.contextTimeouts.get(testId);
      if (timeout) {
        clearTimeout(timeout);
        this.contextTimeouts.delete(testId);
      }

      this.activeContexts.delete(testId);
      this.logger.log(`✅ Isolation context cleaned up for test: ${testId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to cleanup isolation context for ${testId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up all active contexts
   */
  async cleanupAllContexts(): Promise<void> {
    this.logger.log('🧹 Cleaning up all isolation contexts...');

    const testIds = Array.from(this.activeContexts.keys());
    const cleanupPromises = testIds.map(testId => this.cleanupContext(testId));

    try {
      await Promise.all(cleanupPromises);
      this.logger.log('✅ All isolation contexts cleaned up');
    } catch (error) {
      this.logger.error('❌ Failed to cleanup some isolation contexts:', error);
      throw error;
    }
  }

  /**
   * Execute function within isolation context
   */
  async executeWithIsolation<T>(
    testId: string,
    fn: () => Promise<T>,
    config: IsolationConfig = {
      isolationLevel: 'transaction',
      autoCleanup: true,
      rollbackOnFailure: true,
    }
  ): Promise<T> {
    const context = await this.createContext(testId, config);

    try {
      const result = await fn();
      
      if (config.autoCleanup) {
        await this.cleanupContext(testId);
      }

      return result;
    } catch (error) {
      this.logger.error(`❌ Error in isolated execution for ${testId}:`, error);

      if (config.rollbackOnFailure) {
        try {
          await this.rollbackContext(testId);
        } catch (rollbackError) {
          this.logger.error(`❌ Failed to rollback context ${testId}:`, rollbackError);
        }
      }

      if (config.autoCleanup) {
        try {
          await this.cleanupContext(testId);
        } catch (cleanupError) {
          this.logger.error(`❌ Failed to cleanup context ${testId}:`, cleanupError);
        }
      }

      throw error;
    }
  }

  /**
   * Get isolation statistics
   */
  getIsolationStats(): {
    activeContexts: number;
    contextsByType: { [key: string]: number };
    oldestContext?: Date;
    newestContext?: Date;
  } {
    const contexts = Array.from(this.activeContexts.values());
    const contextsByType: { [key: string]: number } = {};

    contexts.forEach(context => {
      contextsByType[context.isolationLevel] = (contextsByType[context.isolationLevel] || 0) + 1;
    });

    const timestamps = contexts.map(c => c.timestamp);
    const oldestContext = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : undefined;
    const newestContext = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : undefined;

    return {
      activeContexts: contexts.length,
      contextsByType,
      oldestContext,
      newestContext,
    };
  }

  /**
   * Create transaction-level isolation
   */
  private async createTransactionIsolation(context: IsolationContext): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Store query runner in context for later cleanup
    (context as any).queryRunner = queryRunner;

    // Set session identifier for tracking
    await queryRunner.query(`SET SESSION test_session_id = '${context.sessionId}'`);
  }

  /**
   * Create schema-level isolation
   */
  private async createSchemaIsolation(context: IsolationContext): Promise<void> {
    const schemaName = `test_schema_${context.sessionId}`;
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Create temporary schema
      await queryRunner.query(`CREATE SCHEMA ${schemaName}`);
      
      // Set search path to the new schema
      await queryRunner.query(`SET search_path TO ${schemaName}, public`);

      // Store schema name in context
      (context as any).schemaName = schemaName;
      (context as any).queryRunner = queryRunner;
    } catch (error) {
      await queryRunner.release();
      throw error;
    }
  }

  /**
   * Create database-level isolation
   */
  private async createDatabaseIsolation(context: IsolationContext): Promise<void> {
    const databaseName = `test_db_${context.sessionId}`;
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Create temporary database
      await queryRunner.query(`CREATE DATABASE ${databaseName}`);
      
      // Store database name in context
      (context as any).databaseName = databaseName;
      (context as any).queryRunner = queryRunner;
    } catch (error) {
      await queryRunner.release();
      throw error;
    }
  }

  /**
   * Cleanup transaction-level isolation
   */
  private async cleanupTransactionIsolation(context: IsolationContext): Promise<void> {
    const queryRunner = (context as any).queryRunner;
    if (queryRunner) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    }
  }

  /**
   * Cleanup schema-level isolation
   */
  private async cleanupSchemaIsolation(context: IsolationContext): Promise<void> {
    const queryRunner = (context as any).queryRunner;
    const schemaName = (context as any).schemaName;

    if (queryRunner) {
      try {
        // Drop temporary schema
        if (schemaName) {
          await queryRunner.query(`DROP SCHEMA ${schemaName} CASCADE`);
        }
      } finally {
        await queryRunner.release();
      }
    }
  }

  /**
   * Cleanup database-level isolation
   */
  private async cleanupDatabaseIsolation(context: IsolationContext): Promise<void> {
    const queryRunner = (context as any).queryRunner;
    const databaseName = (context as any).databaseName;

    if (queryRunner) {
      try {
        // Drop temporary database
        if (databaseName) {
          await queryRunner.query(`DROP DATABASE ${databaseName}`);
        }
      } finally {
        await queryRunner.release();
      }
    }
  }

  /**
   * Rollback context
   */
  private async rollbackContext(testId: string): Promise<void> {
    const context = this.activeContexts.get(testId);
    if (!context) {
      return;
    }

    this.logger.log(`⏪ Rolling back isolation context for test: ${testId}`);

    try {
      switch (context.isolationLevel) {
        case 'transaction':
          await this.cleanupTransactionIsolation(context);
          break;
        case 'schema':
          await this.cleanupSchemaIsolation(context);
          break;
        case 'database':
          await this.cleanupDatabaseIsolation(context);
          break;
      }

      this.logger.log(`✅ Context rolled back for test: ${testId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to rollback context ${testId}:`, error);
      throw error;
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
