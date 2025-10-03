#!/usr/bin/env ts-node

import { spawn } from 'child_process';
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';

/**
 * Database configuration interface
 */
interface DatabaseConfig {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  entities: string[];
  migrations: string[];
  synchronize: boolean;
  logging: boolean;
}

/**
 * Migration backup interface
 */
interface MigrationBackup {
  filename: string;
  path: string;
  timestamp: Date;
  size: number;
}

/**
 * Database health check result interface
 */
interface DatabaseHealthResult {
  connection: boolean;
  currentTime: string;
  databaseSize: string;
  activeConnections: number;
  longRunningQueries: number;
}

/**
 * Error codes for consistent error handling
 */
enum ErrorCodes {
  DATABASE_CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  MIGRATION_FAILED = 'MIGRATION_FAILED',
  MIGRATION_REVERT_FAILED = 'MIGRATION_REVERT_FAILED',
  SCHEMA_VALIDATION_FAILED = 'SCHEMA_VALIDATION_FAILED',
  DATABASE_OPTIMIZATION_FAILED = 'DB_OPTIMIZATION_FAILED',
  BACKUP_CREATION_FAILED = 'BACKUP_CREATION_FAILED',
  BACKUP_RESTORE_FAILED = 'BACKUP_RESTORE_FAILED',
  HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
  MIGRATION_GENERATION_FAILED = 'MIGRATION_GENERATION_FAILED',
  FILE_OPERATION_FAILED = 'FILE_OPERATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
}

/**
 * Standardized migration template with transactional guards
 */
const MIGRATION_TEMPLATE = `import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: {{MIGRATION_NAME}}
 * Description: {{MIGRATION_DESCRIPTION}}
 * Author: {{AUTHOR}}
 * Date: {{DATE}}
 *
 * This migration includes:
 * - Transactional safety guards
 * - Proper error handling
 * - Rollback support
 * - Performance considerations
 */
export class {{MIGRATION_CLASS_NAME}} implements MigrationInterface {
  name = '{{MIGRATION_NAME}}';

  /**
   * Execute the migration up
   * @param queryRunner - TypeORM QueryRunner instance
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Start transaction for safety
    await queryRunner.startTransaction();

    try {
      // TODO: Implement your migration logic here
      // Example:
      // await queryRunner.query(\`CREATE TABLE example_table (
      //   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      //   name VARCHAR(255) NOT NULL,
      //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      // )\`);

      // Commit transaction on success
      await queryRunner.commitTransaction();
      console.log('✅ Migration {{MIGRATION_NAME}} completed successfully');
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      console.error('❌ Migration {{MIGRATION_NAME}} failed:', error);
      throw error;
    }
  }

  /**
   * Execute the migration down (rollback)
   * @param queryRunner - TypeORM QueryRunner instance
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Start transaction for safety
    await queryRunner.startTransaction();

    try {
      // TODO: Implement your rollback logic here
      // Example:
      // await queryRunner.query('DROP TABLE IF EXISTS example_table');

      // Commit transaction on success
      await queryRunner.commitTransaction();
      console.log('✅ Migration {{MIGRATION_NAME}} rolled back successfully');
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      console.error('❌ Migration {{MIGRATION_NAME}} rollback failed:', error);
      throw error;
    }
  }
}
`;

/**
 * Database Manager Class
 * Provides comprehensive database management functionality
 */
class DatabaseManager {
  private dataSource: DataSource | null = null;
  private readonly config: DatabaseConfig;

  constructor() {
    this.config = this.loadDatabaseConfig();
  }

  /**
   * Load database configuration from environment variables
   */
  private loadDatabaseConfig(): DatabaseConfig {
    return {
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'password',
      database: process.env.DATABASE_NAME || 'streller_minds',
      entities: ['src/**/*.entity.ts'],
      migrations: ['src/database/migrations/*.ts'],
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
    };
  }

  /**
   * Initialize the database connection
   */
  async initialize(): Promise<void> {
    try {
      this.dataSource = new DataSource(this.config);

      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
        console.log('🔗 Database connection established');
      }
    } catch (error) {
      console.error('❌ Failed to initialize database connection:', error);
      throw new Error(
        `${ErrorCodes.DATABASE_CONNECTION_FAILED}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Run pending migrations
   */
  async runMigrations(): Promise<void> {
    console.log('🚀 Running database migrations...');

    try {
      await this.initialize();
      const migrations = await this.dataSource!.runMigrations();

      if (migrations.length === 0) {
        console.log('✅ No pending migrations found');
      } else {
        console.log(`✅ Successfully ran ${migrations.length} migrations:`);
        migrations.forEach((migration: any) => {
          console.log(`   - ${migration.name}`);
        });
      }
    } catch (error) {
      console.error('❌ Migration failed:', error instanceof Error ? error.message : String(error));
      throw new Error(
        `${ErrorCodes.MIGRATION_FAILED}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Revert the last migration
   */
  async revertMigration(): Promise<void> {
    console.log('🔄 Reverting last migration...');

    try {
      await this.initialize();
      await this.dataSource!.undoLastMigration();
      console.log('✅ Successfully reverted last migration');
    } catch (error) {
      console.error(
        '❌ Migration revert failed:',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `${ErrorCodes.MIGRATION_REVERT_FAILED}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Show migration status
   */
  async showMigrations(): Promise<void> {
    console.log('📋 Migration status:');

    try {
      await this.initialize();
      const migrations = await this.dataSource!.showMigrations();

      if (migrations) {
        console.log('⚠️  There are pending migrations');
      } else {
        console.log('✅ All migrations are up to date');
      }
    } catch (error) {
      console.error(
        '❌ Failed to check migration status:',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `${ErrorCodes.MIGRATION_FAILED}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Validate database schema
   */
  async validateSchema(): Promise<void> {
    console.log('🔍 Validating database schema...');

    try {
      await this.initialize();

      // Run schema analysis
      const SchemaAnalyzer = require('./schema-analysis');
      const analyzer = new SchemaAnalyzer();
      await analyzer.analyze();

      console.log('✅ Schema validation completed');
    } catch (error) {
      console.error(
        '❌ Schema validation failed:',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `${ErrorCodes.SCHEMA_VALIDATION_FAILED}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Optimize database performance
   */
  async optimizeDatabase(): Promise<void> {
    console.log('⚡ Optimizing database performance...');

    try {
      await this.initialize();
      const queryRunner = this.dataSource!.createQueryRunner();

      try {
        await queryRunner.connect();

        // Update table statistics
        console.log('   Updating table statistics...');
        await queryRunner.query('ANALYZE;');

        // Vacuum tables
        console.log('   Vacuuming tables...');
        await queryRunner.query('VACUUM;');

        // Reindex tables
        console.log('   Reindexing tables...');
        await queryRunner.query('REINDEX DATABASE CONCURRENTLY;');

        console.log('✅ Database optimization completed');
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      console.error(
        '❌ Database optimization failed:',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `${ErrorCodes.DATABASE_OPTIMIZATION_FAILED}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Create database backup
   */
  async createBackup(filename?: string): Promise<string> {
    console.log(`💾 Creating database backup: ${filename || 'auto-generated'}`);

    try {
      const backupDir = path.join(process.cwd(), 'database-backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const backupPath = path.join(backupDir, filename || `backup-${Date.now()}.sql`);

      // Use pg_dump for PostgreSQL backup
      const pgDump = spawn('pg_dump', [
        '-h',
        this.config.host,
        '-p',
        this.config.port.toString(),
        '-U',
        this.config.username,
        '-d',
        this.config.database,
        '-f',
        backupPath,
        '--verbose',
      ]);

      return new Promise<string>((resolve, reject) => {
        pgDump.on('close', (code: number) => {
          if (code === 0) {
            console.log(`✅ Backup created successfully: ${backupPath}`);
            resolve(backupPath);
          } else {
            reject(
              new Error(`${ErrorCodes.BACKUP_CREATION_FAILED}: pg_dump failed with code ${code}`),
            );
          }
        });

        pgDump.on('error', (error: Error) => {
          reject(
            new Error(
              `${ErrorCodes.BACKUP_CREATION_FAILED}: Failed to start pg_dump: ${error.message}`,
            ),
          );
        });
      });
    } catch (error) {
      console.error(
        '❌ Backup creation failed:',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `${ErrorCodes.BACKUP_CREATION_FAILED}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupPath: string): Promise<void> {
    console.log(`📥 Restoring database from backup: ${backupPath}`);

    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`${ErrorCodes.INVALID_INPUT}: Backup file not found: ${backupPath}`);
      }

      // Use psql for PostgreSQL restore
      const psql = spawn('psql', [
        '-h',
        this.config.host,
        '-p',
        this.config.port.toString(),
        '-U',
        this.config.username,
        '-d',
        this.config.database,
        '-f',
        backupPath,
        '--verbose',
      ]);

      return new Promise<void>((resolve, reject) => {
        psql.on('close', (code: number) => {
          if (code === 0) {
            console.log('✅ Database restored successfully');
            resolve();
          } else {
            reject(new Error(`${ErrorCodes.BACKUP_RESTORE_FAILED}: psql failed with code ${code}`));
          }
        });

        psql.on('error', (error: Error) => {
          reject(
            new Error(
              `${ErrorCodes.BACKUP_RESTORE_FAILED}: Failed to start psql: ${error.message}`,
            ),
          );
        });
      });
    } catch (error) {
      console.error(
        '❌ Database restore failed:',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `${ErrorCodes.BACKUP_RESTORE_FAILED}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Check database health
   */
  async checkHealth(): Promise<DatabaseHealthResult> {
    console.log('🏥 Checking database health...');

    try {
      await this.initialize();
      const queryRunner = this.dataSource!.createQueryRunner();

      try {
        await queryRunner.connect();

        // Check connection
        const result = await queryRunner.query('SELECT NOW() as current_time');
        console.log(`✅ Database connection: OK (${result[0].current_time})`);

        // Check database size
        const sizeResult = await queryRunner.query(`
          SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `);
        console.log(`📊 Database size: ${sizeResult[0].size}`);

        // Check active connections
        const connectionsResult = await queryRunner.query(`
          SELECT count(*) as active_connections
          FROM pg_stat_activity
          WHERE state = 'active'
        `);
        console.log(`🔗 Active connections: ${connectionsResult[0].active_connections}`);

        // Check for long-running queries
        const longQueriesResult = await queryRunner.query(`
          SELECT count(*) as long_queries
          FROM pg_stat_activity
          WHERE state = 'active'
          AND query_start < NOW() - INTERVAL '5 minutes'
        `);
        console.log(`⏱️  Long-running queries: ${longQueriesResult[0].long_queries}`);

        console.log('✅ Database health check completed');

        return {
          connection: true,
          currentTime: result[0].current_time,
          databaseSize: sizeResult[0].size,
          activeConnections: parseInt(connectionsResult[0].active_connections),
          longRunningQueries: parseInt(longQueriesResult[0].long_queries),
        };
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      console.error(
        '❌ Database health check failed:',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `${ErrorCodes.HEALTH_CHECK_FAILED}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Generate new migration with standardized template
   */
  async generateMigration(name: string, description?: string): Promise<string> {
    console.log(`📝 Generating migration: ${name}`);

    try {
      // Note: Migration generation doesn't require database connection

      // Validate migration name
      if (!name || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
        throw new Error(
          `${ErrorCodes.INVALID_INPUT}: Invalid migration name. Use camelCase format.`,
        );
      }

      const timestamp = Date.now();
      const migrationName = `${timestamp}-${name}`;
      const migrationPath = path.join(
        process.cwd(),
        'src',
        'database',
        'migrations',
        `${migrationName}.ts`,
      );

      // Ensure migrations directory exists
      const migrationsDir = path.dirname(migrationPath);
      if (!fs.existsSync(migrationsDir)) {
        fs.mkdirSync(migrationsDir, { recursive: true });
      }

      // Generate migration class name
      const className = name.charAt(0).toUpperCase() + name.slice(1) + timestamp;

      // Replace template placeholders
      const migrationContent = MIGRATION_TEMPLATE.replace(/{{MIGRATION_NAME}}/g, migrationName)
        .replace(/{{MIGRATION_CLASS_NAME}}/g, className)
        .replace(/{{MIGRATION_DESCRIPTION}}/g, description || 'No description provided')
        .replace(/{{AUTHOR}}/g, process.env.USER || 'Unknown')
        .replace(/{{DATE}}/g, new Date().toISOString());

      fs.writeFileSync(migrationPath, migrationContent);
      console.log(`✅ Migration created: ${migrationPath}`);

      return migrationPath;
    } catch (error) {
      console.error(
        '❌ Migration generation failed:',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `${ErrorCodes.MIGRATION_GENERATION_FAILED}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Cleanup database connection
   */
  async cleanup(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// CLI Commands
const program = new Command();
program
  .name('db-manager')
  .description('Database management CLI for StrellerMinds')
  .version('1.0.0');

program
  .command('migrate')
  .description('Run pending migrations')
  .action(async () => {
    const manager = new DatabaseManager();
    try {
      await manager.runMigrations();
    } catch (error) {
      console.error(
        '❌ Migration command failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    } finally {
      await manager.cleanup();
    }
  });

program
  .command('revert')
  .description('Revert last migration')
  .action(async () => {
    const manager = new DatabaseManager();
    try {
      await manager.revertMigration();
    } catch (error) {
      console.error(
        '❌ Revert command failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    } finally {
      await manager.cleanup();
    }
  });

program
  .command('status')
  .description('Show migration status')
  .action(async () => {
    const manager = new DatabaseManager();
    try {
      await manager.showMigrations();
    } catch (error) {
      console.error(
        '❌ Status command failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    } finally {
      await manager.cleanup();
    }
  });

program
  .command('validate')
  .description('Validate database schema')
  .action(async () => {
    const manager = new DatabaseManager();
    try {
      await manager.validateSchema();
    } catch (error) {
      console.error(
        '❌ Validation command failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    } finally {
      await manager.cleanup();
    }
  });

program
  .command('optimize')
  .description('Optimize database performance')
  .action(async () => {
    const manager = new DatabaseManager();
    try {
      await manager.optimizeDatabase();
    } catch (error) {
      console.error(
        '❌ Optimization command failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    } finally {
      await manager.cleanup();
    }
  });

program
  .command('backup')
  .description('Create database backup')
  .option('-f, --filename <filename>', 'Backup filename')
  .action(async (options: any) => {
    const manager = new DatabaseManager();
    try {
      await manager.createBackup(options.filename);
    } catch (error) {
      console.error(
        '❌ Backup command failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    } finally {
      await manager.cleanup();
    }
  });

program
  .command('restore <backup-path>')
  .description('Restore database from backup')
  .action(async (backupPath: string) => {
    const manager = new DatabaseManager();
    try {
      await manager.restoreBackup(backupPath);
    } catch (error) {
      console.error(
        '❌ Restore command failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    } finally {
      await manager.cleanup();
    }
  });

program
  .command('health')
  .description('Check database health')
  .action(async () => {
    const manager = new DatabaseManager();
    try {
      await manager.checkHealth();
    } catch (error) {
      console.error(
        '❌ Health check command failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    } finally {
      await manager.cleanup();
    }
  });

program
  .command('generate <name>')
  .description('Generate new migration')
  .option('-d, --description <description>', 'Migration description')
  .action(async (name: string, options: any) => {
    const manager = new DatabaseManager();
    try {
      await manager.generateMigration(name, options.description);
    } catch (error) {
      console.error(
        '❌ Generate command failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    } finally {
      await manager.cleanup();
    }
  });

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught exception:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});

process.on('unhandledRejection', (error: any) => {
  console.error('❌ Unhandled rejection:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

export {
  DatabaseManager,
  ErrorCodes,
  type DatabaseConfig,
  type DatabaseHealthResult,
  type MigrationBackup,
};
