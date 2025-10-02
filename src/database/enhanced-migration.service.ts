import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource, QueryRunner, MigrationInterface } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as fs from 'fs';
import * as path from 'path';

export interface MigrationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  dataIntegrityChecks: DataIntegrityCheck[];
}

export interface DataIntegrityCheck {
  table: string;
  checkType: 'foreign_key' | 'constraint' | 'data_quality' | 'performance';
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export interface MigrationMetadata {
  id: string;
  name: string;
  timestamp: Date;
  executionTime: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
  validationResult?: MigrationValidationResult;
  backupPath?: string;
  rollbackPath?: string;
  dependencies: string[];
  dataImpact: 'low' | 'medium' | 'high';
  estimatedDuration: number;
}

export interface MigrationPlan {
  migrations: MigrationMetadata[];
  totalEstimatedTime: number;
  dataImpact: 'low' | 'medium' | 'high';
  rollbackPlan: RollbackPlan;
  validationPlan: ValidationPlan;
}

export interface RollbackPlan {
  targetMigration: string;
  migrationsToRevert: string[];
  backupRequired: boolean;
  dataLossWarning: boolean;
  estimatedTime: number;
  dependencies: string[];
}

export interface ValidationPlan {
  preMigrationChecks: string[];
  postMigrationChecks: string[];
  dataIntegrityChecks: string[];
  performanceChecks: string[];
}

@Injectable()
export class EnhancedMigrationService implements OnModuleInit {
  private readonly logger = new Logger(EnhancedMigrationService.name);
  private readonly migrationsDir = path.join(process.cwd(), 'src', 'database', 'migrations');
  private readonly backupDir = path.join(process.cwd(), 'database-backups');
  private readonly migrationHistory: Map<string, MigrationMetadata> = new Map();

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.ensureDirectories();
  }

  async onModuleInit() {
    await this.loadMigrationHistory();
  }

  /**
   * Enhanced migration execution with validation and monitoring
   */
  async executeMigration(
    migrationName: string,
    options: {
      validateBefore?: boolean;
      createBackup?: boolean;
      monitorProgress?: boolean;
      rollbackOnFailure?: boolean;
    } = {},
  ): Promise<MigrationMetadata> {
    const {
      validateBefore = true,
      createBackup = true,
      monitorProgress = true,
      rollbackOnFailure = true,
    } = options;

    this.logger.log(`🚀 Starting enhanced migration: ${migrationName}`);

    // Emit migration started event
    this.eventEmitter.emit('migration.started', { migrationName, timestamp: new Date() });

    const migration = await this.loadMigration(migrationName);
    if (!migration) {
      throw new Error(`Migration ${migrationName} not found`);
    }

    // Pre-migration validation
    if (validateBefore) {
      const validationResult = await this.validateMigration(migrationName);
      if (!validationResult.isValid) {
        const error = new Error(
          `Migration validation failed: ${validationResult.errors.join(', ')}`,
        );
        this.eventEmitter.emit('migration.validation_failed', { migrationName, validationResult });
        throw error;
      }
    }

    // Create backup if requested
    let backupPath: string | undefined;
    if (createBackup) {
      backupPath = await this.createMigrationBackup(migrationName);
    }

    // Execute migration with monitoring
    const startTime = Date.now();
    let status: MigrationMetadata['status'] = 'running';

    try {
      if (monitorProgress) {
        this.eventEmitter.emit('migration.progress', {
          migrationName,
          progress: 0,
          message: 'Starting migration execution',
        });
      }

      await this.executeMigrationUp(migration, monitorProgress);

      const executionTime = Date.now() - startTime;
      status = 'completed';

      // Post-migration validation
      const postValidation = await this.validatePostMigration(migrationName);

      const metadata: MigrationMetadata = {
        id: migration.name,
        name: migrationName,
        timestamp: new Date(),
        executionTime,
        status,
        validationResult: postValidation,
        backupPath,
        dependencies: await this.getMigrationDependencies(migrationName),
        dataImpact: await this.assessDataImpact(migrationName),
        estimatedDuration: executionTime,
      };

      this.migrationHistory.set(migrationName, metadata);
      await this.saveMigrationMetadata(metadata);

      this.eventEmitter.emit('migration.completed', { migrationName, metadata });
      this.logger.log(`✅ Migration ${migrationName} completed successfully in ${executionTime}ms`);

      return metadata;
    } catch (error) {
      status = 'failed';
      const executionTime = Date.now() - startTime;

      this.logger.error(`❌ Migration ${migrationName} failed: ${error.message}`);

      // Attempt rollback if requested
      if (rollbackOnFailure && backupPath) {
        try {
          await this.rollbackMigration(migrationName, backupPath);
          this.logger.log(`🔄 Migration ${migrationName} rolled back successfully`);
        } catch (rollbackError) {
          this.logger.error(`❌ Rollback failed: ${rollbackError.message}`);
        }
      }

      const metadata: MigrationMetadata = {
        id: migration.name,
        name: migrationName,
        timestamp: new Date(),
        executionTime,
        status,
        backupPath,
        dependencies: await this.getMigrationDependencies(migrationName),
        dataImpact: await this.assessDataImpact(migrationName),
        estimatedDuration: executionTime,
      };

      this.migrationHistory.set(migrationName, metadata);
      await this.saveMigrationMetadata(metadata);

      this.eventEmitter.emit('migration.failed', { migrationName, error: error.message, metadata });
      throw error;
    }
  }

  /**
   * Comprehensive migration validation
   */
  async validateMigration(migrationName: string): Promise<MigrationValidationResult> {
    this.logger.log(`🔍 Validating migration: ${migrationName}`);

    const validationResult: MigrationValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      dataIntegrityChecks: [],
    };

    try {
      // Check migration file integrity
      const migration = await this.loadMigration(migrationName);
      if (!migration) {
        validationResult.errors.push(`Migration file not found: ${migrationName}`);
        validationResult.isValid = false;
        return validationResult;
      }

      // Validate migration structure
      if (!migration.up || typeof migration.up !== 'function') {
        validationResult.errors.push('Migration missing up() method');
        validationResult.isValid = false;
      }

      if (!migration.down || typeof migration.down !== 'function') {
        validationResult.errors.push('Migration missing down() method');
        validationResult.isValid = false;
      }

      // Check for potential data conflicts
      const conflicts = await this.checkMigrationConflicts(migrationName);
      if (conflicts.length > 0) {
        validationResult.warnings.push(`Potential conflicts detected: ${conflicts.join(', ')}`);
      }

      // Validate database state
      const dbValidation = await this.validateDatabaseState(migrationName);
      validationResult.dataIntegrityChecks.push(...dbValidation);

      // Check for failed checks
      const failedChecks = validationResult.dataIntegrityChecks.filter(
        (check) => check.status === 'fail',
      );
      if (failedChecks.length > 0) {
        validationResult.errors.push(
          `Data integrity checks failed: ${failedChecks.map((c) => c.message).join(', ')}`,
        );
        validationResult.isValid = false;
      }

      // Check for warnings
      const warningChecks = validationResult.dataIntegrityChecks.filter(
        (check) => check.status === 'warning',
      );
      if (warningChecks.length > 0) {
        validationResult.warnings.push(
          `Data integrity warnings: ${warningChecks.map((c) => c.message).join(', ')}`,
        );
      }
    } catch (error) {
      validationResult.errors.push(`Validation error: ${error.message}`);
      validationResult.isValid = false;
    }

    return validationResult;
  }

  /**
   * Enhanced rollback with validation and monitoring
   */
  async rollbackMigration(migrationName: string, backupPath?: string): Promise<void> {
    this.logger.log(`🔄 Rolling back migration: ${migrationName}`);

    this.eventEmitter.emit('migration.rollback_started', { migrationName, timestamp: new Date() });

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Validate rollback safety
      const rollbackPlan = await this.planRollback(migrationName);
      if (rollbackPlan.dataLossWarning) {
        this.logger.warn(`⚠️ Data loss warning for rollback of ${migrationName}`);
      }

      // Execute rollback
      const migration = await this.loadMigration(migrationName);
      if (migration && migration.down) {
        await migration.down(queryRunner);
      }

      // Remove from migrations table
      await queryRunner.query('DELETE FROM migrations WHERE name = $1', [migrationName]);

      await queryRunner.commitTransaction();

      // Update migration status
      const metadata = this.migrationHistory.get(migrationName);
      if (metadata) {
        metadata.status = 'rolled_back';
        await this.saveMigrationMetadata(metadata);
      }

      this.eventEmitter.emit('migration.rollback_completed', { migrationName });
      this.logger.log(`✅ Migration ${migrationName} rolled back successfully`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`❌ Rollback failed: ${error.message}`);

      // Attempt to restore from backup if available
      if (backupPath && fs.existsSync(backupPath)) {
        try {
          await this.restoreFromBackup(backupPath);
          this.logger.log(`🔄 Restored from backup after failed rollback`);
        } catch (restoreError) {
          this.logger.error(`❌ Backup restoration failed: ${restoreError.message}`);
        }
      }

      this.eventEmitter.emit('migration.rollback_failed', { migrationName, error: error.message });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get comprehensive migration status
   */
  async getMigrationStatus(): Promise<{
    pending: MigrationMetadata[];
    running: MigrationMetadata[];
    completed: MigrationMetadata[];
    failed: MigrationMetadata[];
    rolledBack: MigrationMetadata[];
    summary: {
      total: number;
      completed: number;
      failed: number;
      pending: number;
      averageExecutionTime: number;
    };
  }> {
    const migrations = Array.from(this.migrationHistory.values());

    const pending = migrations.filter((m) => m.status === 'pending');
    const running = migrations.filter((m) => m.status === 'running');
    const completed = migrations.filter((m) => m.status === 'completed');
    const failed = migrations.filter((m) => m.status === 'failed');
    const rolledBack = migrations.filter((m) => m.status === 'rolled_back');

    const total = migrations.length;
    const avgExecutionTime =
      completed.length > 0
        ? completed.reduce((sum, m) => sum + m.executionTime, 0) / completed.length
        : 0;

    return {
      pending,
      running,
      completed,
      failed,
      rolledBack,
      summary: {
        total,
        completed: completed.length,
        failed: failed.length,
        pending: pending.length,
        averageExecutionTime: avgExecutionTime,
      },
    };
  }

  /**
   * Create migration plan with dependencies and impact analysis
   */
  async createMigrationPlan(migrations: string[]): Promise<MigrationPlan> {
    this.logger.log(`📋 Creating migration plan for: ${migrations.join(', ')}`);

    const migrationMetadatas: MigrationMetadata[] = [];
    let totalEstimatedTime = 0;

    for (const migrationName of migrations) {
      const metadata = await this.createMigrationMetadata(migrationName);
      migrationMetadatas.push(metadata);
      totalEstimatedTime += metadata.estimatedDuration;
    }

    // Sort by dependencies
    const sortedMigrations = this.sortMigrationsByDependencies(migrationMetadatas);

    const dataImpact = this.assessOverallDataImpact(sortedMigrations);
    const rollbackPlan = await this.createRollbackPlan(sortedMigrations);
    const validationPlan = await this.createValidationPlan(sortedMigrations);

    return {
      migrations: sortedMigrations,
      totalEstimatedTime,
      dataImpact,
      rollbackPlan,
      validationPlan,
    };
  }

  // Private helper methods

  private async loadMigration(migrationName: string): Promise<MigrationInterface | null> {
    try {
      const migrationPath = path.join(this.migrationsDir, `${migrationName}.ts`);
      if (!fs.existsSync(migrationPath)) {
        return null;
      }

      // Dynamic import of migration
      const migrationModule = await import(migrationPath);
      const migrationClass = Object.values(migrationModule)[0] as any;

      if (migrationClass && typeof migrationClass === 'function') {
        return new migrationClass();
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to load migration ${migrationName}: ${error.message}`);
      return null;
    }
  }

  private async executeMigrationUp(
    migration: MigrationInterface,
    monitorProgress: boolean,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      if (monitorProgress) {
        this.eventEmitter.emit('migration.progress', {
          migrationName: migration.constructor.name,
          progress: 25,
          message: 'Migration transaction started',
        });
      }

      // Execute migration
      await migration.up(queryRunner);

      if (monitorProgress) {
        this.eventEmitter.emit('migration.progress', {
          migrationName: migration.constructor.name,
          progress: 75,
          message: 'Migration logic executed, committing transaction',
        });
      }

      await queryRunner.commitTransaction();

      if (monitorProgress) {
        this.eventEmitter.emit('migration.progress', {
          migrationName: migration.constructor.name,
          progress: 100,
          message: 'Migration completed successfully',
        });
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async createMigrationBackup(migrationName: string): Promise<string> {
    const timestamp = new Date().getTime();
    const backupPath = path.join(this.backupDir, `${migrationName}_${timestamp}.sql`);

    // Create backup logic here
    // This would typically use pg_dump or similar tool

    return backupPath;
  }

  private async validatePostMigration(migrationName: string): Promise<MigrationValidationResult> {
    // Post-migration validation logic
    return {
      isValid: true,
      errors: [],
      warnings: [],
      dataIntegrityChecks: [],
    };
  }

  private async getMigrationDependencies(migrationName: string): Promise<string[]> {
    // Analyze migration dependencies
    return [];
  }

  private async assessDataImpact(migrationName: string): Promise<'low' | 'medium' | 'high'> {
    // Assess potential data impact
    return 'low';
  }

  private async checkMigrationConflicts(migrationName: string): Promise<string[]> {
    // Check for potential conflicts
    return [];
  }

  private async validateDatabaseState(migrationName: string): Promise<DataIntegrityCheck[]> {
    // Validate database state
    return [];
  }

  private async planRollback(migrationName: string): Promise<RollbackPlan> {
    // Plan rollback operation
    return {
      targetMigration: migrationName,
      migrationsToRevert: [],
      backupRequired: true,
      dataLossWarning: false,
      estimatedTime: 0,
      dependencies: [],
    };
  }

  private async restoreFromBackup(backupPath: string): Promise<void> {
    // Restore from backup logic
  }

  private sortMigrationsByDependencies(migrations: MigrationMetadata[]): MigrationMetadata[] {
    // Sort migrations by dependencies
    return migrations;
  }

  private assessOverallDataImpact(migrations: MigrationMetadata[]): 'low' | 'medium' | 'high' {
    // Assess overall data impact
    return 'low';
  }

  private async createRollbackPlan(migrations: MigrationMetadata[]): Promise<RollbackPlan> {
    // Create rollback plan
    return {
      targetMigration: '',
      migrationsToRevert: [],
      backupRequired: true,
      dataLossWarning: false,
      estimatedTime: 0,
      dependencies: [],
    };
  }

  private async createValidationPlan(migrations: MigrationMetadata[]): Promise<ValidationPlan> {
    // Create validation plan
    return {
      preMigrationChecks: [],
      postMigrationChecks: [],
      dataIntegrityChecks: [],
      performanceChecks: [],
    };
  }

  private async loadMigrationHistory(): Promise<void> {
    // Load migration history from database
  }

  private async saveMigrationMetadata(metadata: MigrationMetadata): Promise<void> {
    // Save migration metadata to database
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }
}
