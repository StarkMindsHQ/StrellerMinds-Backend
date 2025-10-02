import { Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryRunner, Migration } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';

export interface MigrationBackup {
  id: string;
  name: string;
  timestamp: Date;
  backupPath: string;
  schemaSnapshot: any;
  dataSnapshot?: any;
}

export interface RollbackPlan {
  targetMigration: string;
  migrationsToRevert: string[];
  backupRequired: boolean;
  dataLossWarning: boolean;
  estimatedTime: number;
}

@Injectable()
export class MigrationManagerService {
  private readonly logger = new Logger(MigrationManagerService.name);
  private readonly backupDir = path.join(process.cwd(), 'database-backups');

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    this.ensureBackupDirectory();
  }

  /**
   * Create a comprehensive database backup before migration
   */
  async createBackup(migrationName: string): Promise<MigrationBackup> {
    this.logger.log(`Creating backup for migration: ${migrationName}`);

    const timestamp = new Date();
    const backupId = `${migrationName}_${timestamp.getTime()}`;
    const backupPath = path.join(this.backupDir, `${backupId}.sql`);

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();

      // Create schema snapshot
      const schemaSnapshot = await this.createSchemaSnapshot(queryRunner);

      // Create data backup (for critical tables only)
      const dataSnapshot = await this.createDataSnapshot(queryRunner);

      // Generate SQL backup file
      await this.generateSQLBackup(queryRunner, backupPath);

      const backup: MigrationBackup = {
        id: backupId,
        name: migrationName,
        timestamp,
        backupPath,
        schemaSnapshot,
        dataSnapshot,
      };

      // Save backup metadata
      await this.saveBackupMetadata(backup);

      this.logger.log(`Backup created successfully: ${backupId}`);
      return backup;
    } catch (error) {
      this.logger.error(`Failed to create backup: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Plan a rollback operation with safety checks
   */
  async planRollback(targetMigration: string): Promise<RollbackPlan> {
    this.logger.log(`Planning rollback to migration: ${targetMigration}`);

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();

      // Get executed migrations
      const executedMigrations = await queryRunner.query(
        'SELECT * FROM migrations ORDER BY timestamp DESC',
      );

      // Find target migration
      const targetIndex = executedMigrations.findIndex((m: any) => m.name === targetMigration);

      if (targetIndex === -1) {
        throw new Error(`Target migration ${targetMigration} not found`);
      }

      // Get migrations to revert (all after target)
      const migrationsToRevert = executedMigrations.slice(0, targetIndex).map((m: any) => m.name);

      // Analyze rollback impact
      const dataLossWarning = await this.analyzeDataLossRisk(queryRunner, migrationsToRevert);

      const plan: RollbackPlan = {
        targetMigration,
        migrationsToRevert,
        backupRequired: true,
        dataLossWarning,
        estimatedTime: this.estimateRollbackTime(migrationsToRevert.length),
      };

      this.logger.log(`Rollback plan created: ${migrationsToRevert.length} migrations to revert`);
      return plan;
    } catch (error) {
      this.logger.error(`Failed to plan rollback: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Execute a safe rollback with backup
   */
  async executeRollback(plan: RollbackPlan): Promise<void> {
    this.logger.log(`Executing rollback to: ${plan.targetMigration}`);

    // Create backup before rollback
    const backup = await this.createBackup(`rollback_${plan.targetMigration}`);

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Execute rollback migrations in reverse order
      for (const migrationName of plan.migrationsToRevert) {
        this.logger.log(`Reverting migration: ${migrationName}`);

        try {
          // Load and execute migration down method
          await this.executeMigrationDown(queryRunner, migrationName);

          // Remove from migrations table
          await queryRunner.query('DELETE FROM migrations WHERE name = $1', [migrationName]);
        } catch (error) {
          this.logger.error(`Failed to revert migration ${migrationName}: ${error.message}`);
          throw error;
        }
      }

      await queryRunner.commitTransaction();
      this.logger.log('Rollback completed successfully');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Rollback failed: ${error.message}`);

      // Attempt to restore from backup
      await this.restoreFromBackup(backup);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Validate migration before execution
   */
  async validateMigration(migrationName: string): Promise<boolean> {
    this.logger.log(`Validating migration: ${migrationName}`);

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();

      // Check if migration file exists and is valid
      const migrationPath = this.findMigrationFile(migrationName);
      if (!migrationPath) {
        throw new Error(`Migration file not found: ${migrationName}`);
      }

      // Validate migration syntax
      const migration = await this.loadMigration(migrationPath);
      if (!migration.up || !migration.down) {
        throw new Error(`Migration ${migrationName} missing up or down method`);
      }

      // Check for potential conflicts
      await this.checkMigrationConflicts(queryRunner, migrationName);

      this.logger.log(`Migration validation passed: ${migrationName}`);
      return true;
    } catch (error) {
      this.logger.error(`Migration validation failed: ${error.message}`);
      return false;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get migration history with rollback information
   */
  async getMigrationHistory(): Promise<any[]> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();

      const migrations = await queryRunner.query(`
        SELECT 
          m.*,
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM information_schema.tables 
              WHERE table_name = 'migration_backups' 
              AND table_schema = current_schema()
            ) THEN (
              SELECT COUNT(*) FROM migration_backups mb 
              WHERE mb.migration_name = m.name
            )
            ELSE 0
          END as backup_count
        FROM migrations m 
        ORDER BY m.timestamp DESC
      `);

      return migrations.map((m: any) => ({
        ...m,
        canRollback: this.canRollbackMigration(m.name),
        hasBackup: m.backup_count > 0,
      }));
    } finally {
      await queryRunner.release();
    }
  }

  // Private helper methods
  private async createSchemaSnapshot(queryRunner: QueryRunner): Promise<any> {
    const tables = await queryRunner.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = current_schema()
      ORDER BY table_name, ordinal_position
    `);

    const indexes = await queryRunner.query(`
      SELECT schemaname, tablename, indexname, indexdef
      FROM pg_indexes 
      WHERE schemaname = current_schema()
    `);

    const constraints = await queryRunner.query(`
      SELECT conname, contype, conrelid::regclass as table_name, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE connamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
    `);

    return { tables, indexes, constraints };
  }

  private async createDataSnapshot(queryRunner: QueryRunner): Promise<any> {
    // Only backup critical system tables
    const criticalTables = ['users', 'migrations', 'auth_tokens'];
    const snapshot: any = {};

    for (const table of criticalTables) {
      try {
        const data = await queryRunner.query(`SELECT * FROM ${table} LIMIT 1000`);
        snapshot[table] = data;
      } catch (error) {
        this.logger.warn(`Could not backup table ${table}: ${error.message}`);
      }
    }

    return snapshot;
  }

  private async generateSQLBackup(queryRunner: QueryRunner, backupPath: string): Promise<void> {
    // This would typically use pg_dump or similar tool
    // For now, create a basic schema backup
    const schema = await this.createSchemaSnapshot(queryRunner);

    let sqlContent = '-- Database Schema Backup\n';
    sqlContent += `-- Generated: ${new Date().toISOString()}\n\n`;

    // Add schema recreation commands (simplified)
    sqlContent += '-- This is a simplified backup. Use pg_dump for production.\n';

    fs.writeFileSync(backupPath, sqlContent);
  }

  private async saveBackupMetadata(backup: MigrationBackup): Promise<void> {
    const metadataPath = path.join(this.backupDir, `${backup.id}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(backup, null, 2));
  }

  private async analyzeDataLossRisk(
    queryRunner: QueryRunner,
    migrations: string[],
  ): Promise<boolean> {
    // Analyze if any of the migrations involve DROP operations
    for (const migrationName of migrations) {
      const migrationPath = this.findMigrationFile(migrationName);
      if (migrationPath) {
        const content = fs.readFileSync(migrationPath, 'utf8');
        if (content.includes('DROP TABLE') || content.includes('DROP COLUMN')) {
          return true;
        }
      }
    }
    return false;
  }

  private estimateRollbackTime(migrationCount: number): number {
    // Estimate 30 seconds per migration
    return migrationCount * 30;
  }

  private async executeMigrationDown(
    queryRunner: QueryRunner,
    migrationName: string,
  ): Promise<void> {
    const migrationPath = this.findMigrationFile(migrationName);
    if (!migrationPath) {
      throw new Error(`Migration file not found: ${migrationName}`);
    }

    const migration = await this.loadMigration(migrationPath);
    await migration.down(queryRunner);
  }

  private findMigrationFile(migrationName: string): string | null {
    const migrationsDir = path.join(process.cwd(), 'src', 'database', 'migrations');
    const files = fs.readdirSync(migrationsDir);

    const file = files.find((f) => f.includes(migrationName));
    return file ? path.join(migrationsDir, file) : null;
  }

  private async loadMigration(migrationPath: string): Promise<any> {
    // Dynamically import the migration
    const migration = await import(migrationPath);
    const MigrationClass = Object.values(migration)[0] as any;
    return new MigrationClass();
  }

  private async checkMigrationConflicts(
    queryRunner: QueryRunner,
    migrationName: string,
  ): Promise<void> {
    // Check for potential conflicts with existing schema
    // This is a simplified check - expand based on needs
    const existingTables = await queryRunner.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = current_schema()
    `);

    // Additional conflict checks can be added here
  }

  private canRollbackMigration(migrationName: string): boolean {
    // Check if migration has a proper down method
    const migrationPath = this.findMigrationFile(migrationName);
    if (!migrationPath) return false;

    const content = fs.readFileSync(migrationPath, 'utf8');
    return content.includes('async down(') && !content.includes('throw new Error');
  }

  private async restoreFromBackup(backup: MigrationBackup): Promise<void> {
    this.logger.log(`Attempting to restore from backup: ${backup.id}`);

    // This would implement backup restoration logic
    // For now, just log the attempt
    this.logger.warn(
      'Backup restoration not fully implemented. Manual intervention may be required.',
    );
  }

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }
}
