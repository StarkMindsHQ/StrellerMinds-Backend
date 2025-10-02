#!/usr/bin/env node

const { program } = require('commander');
const { DataSource } = require('typeorm');
const fs = require('fs');
const path = require('path');

class DatabaseManager {
  constructor() {
    this.dataSource = null;
  }

  async initialize() {
    // Initialize TypeORM DataSource
    // This would typically load from your ormconfig or environment
    this.dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT) || 5432,
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'password',
      database: process.env.DATABASE_NAME || 'streller_minds',
      entities: ['src/**/*.entity.ts'],
      migrations: ['src/database/migrations/*.ts'],
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
    });

    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }
  }

  async runMigrations() {
    console.log('🚀 Running database migrations...');

    try {
      await this.initialize();
      const migrations = await this.dataSource.runMigrations();

      if (migrations.length === 0) {
        console.log('✅ No pending migrations found');
      } else {
        console.log(`✅ Successfully ran ${migrations.length} migrations:`);
        migrations.forEach((migration) => {
          console.log(`   - ${migration.name}`);
        });
      }
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  }

  async revertMigration() {
    console.log('🔄 Reverting last migration...');

    try {
      await this.initialize();
      await this.dataSource.undoLastMigration();
      console.log('✅ Successfully reverted last migration');
    } catch (error) {
      console.error('❌ Migration revert failed:', error.message);
      process.exit(1);
    }
  }

  async showMigrations() {
    console.log('📋 Migration status:');

    try {
      await this.initialize();
      const migrations = await this.dataSource.showMigrations();

      if (migrations) {
        console.log('⚠️  There are pending migrations');
      } else {
        console.log('✅ All migrations are up to date');
      }
    } catch (error) {
      console.error('❌ Failed to check migration status:', error.message);
      process.exit(1);
    }
  }

  async validateSchema() {
    console.log('🔍 Validating database schema...');

    try {
      await this.initialize();

      // Run schema analysis
      const SchemaAnalyzer = require('./schema-analysis');
      const analyzer = new SchemaAnalyzer();
      await analyzer.analyze();

      console.log('✅ Schema validation completed');
    } catch (error) {
      console.error('❌ Schema validation failed:', error.message);
      process.exit(1);
    }
  }

  async optimizeDatabase() {
    console.log('⚡ Optimizing database performance...');

    try {
      await this.initialize();
      const queryRunner = this.dataSource.createQueryRunner();

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
      console.error('❌ Database optimization failed:', error.message);
      process.exit(1);
    }
  }

  async createBackup(filename) {
    console.log(`💾 Creating database backup: ${filename}`);

    try {
      const backupDir = path.join(process.cwd(), 'database-backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const backupPath = path.join(backupDir, filename || `backup-${Date.now()}.sql`);

      // Use pg_dump for PostgreSQL backup
      const { spawn } = require('child_process');
      const pgDump = spawn('pg_dump', [
        '-h',
        process.env.DATABASE_HOST || 'localhost',
        '-p',
        process.env.DATABASE_PORT || '5432',
        '-U',
        process.env.DATABASE_USER || 'postgres',
        '-d',
        process.env.DATABASE_NAME || 'streller_minds',
        '-f',
        backupPath,
        '--verbose',
      ]);

      return new Promise((resolve, reject) => {
        pgDump.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ Backup created successfully: ${backupPath}`);
            resolve(backupPath);
          } else {
            reject(new Error(`pg_dump failed with code ${code}`));
          }
        });

        pgDump.on('error', (error) => {
          reject(new Error(`Failed to start pg_dump: ${error.message}`));
        });
      });
    } catch (error) {
      console.error('❌ Backup creation failed:', error.message);
      process.exit(1);
    }
  }

  async restoreBackup(backupPath) {
    console.log(`📥 Restoring database from backup: ${backupPath}`);

    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      // Use psql for PostgreSQL restore
      const { spawn } = require('child_process');
      const psql = spawn('psql', [
        '-h',
        process.env.DATABASE_HOST || 'localhost',
        '-p',
        process.env.DATABASE_PORT || '5432',
        '-U',
        process.env.DATABASE_USER || 'postgres',
        '-d',
        process.env.DATABASE_NAME || 'streller_minds',
        '-f',
        backupPath,
        '--verbose',
      ]);

      return new Promise((resolve, reject) => {
        psql.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Database restored successfully');
            resolve();
          } else {
            reject(new Error(`psql failed with code ${code}`));
          }
        });

        psql.on('error', (error) => {
          reject(new Error(`Failed to start psql: ${error.message}`));
        });
      });
    } catch (error) {
      console.error('❌ Database restore failed:', error.message);
      process.exit(1);
    }
  }

  async checkHealth() {
    console.log('🏥 Checking database health...');

    try {
      await this.initialize();
      const queryRunner = this.dataSource.createQueryRunner();

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
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      console.error('❌ Database health check failed:', error.message);
      process.exit(1);
    }
  }

  async generateMigration(name) {
    console.log(`📝 Generating migration: ${name}`);

    try {
      await this.initialize();

      // This would typically use TypeORM CLI
      const timestamp = Date.now();
      const migrationName = `${timestamp}-${name}`;
      const migrationPath = path.join(
        process.cwd(),
        'src',
        'database',
        'migrations',
        `${migrationName}.ts`,
      );

      const migrationTemplate = `import { MigrationInterface, QueryRunner } from 'typeorm';

export class ${name}${timestamp} implements MigrationInterface {
  name = '${name}${timestamp}';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // TODO: Implement migration up logic
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // TODO: Implement migration down logic
  }
}
`;

      fs.writeFileSync(migrationPath, migrationTemplate);
      console.log(`✅ Migration created: ${migrationPath}`);
    } catch (error) {
      console.error('❌ Migration generation failed:', error.message);
      process.exit(1);
    }
  }

  async cleanup() {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }
}

// CLI Commands
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
    } finally {
      await manager.cleanup();
    }
  });

program
  .command('backup')
  .description('Create database backup')
  .option('-f, --filename <filename>', 'Backup filename')
  .action(async (options) => {
    const manager = new DatabaseManager();
    try {
      await manager.createBackup(options.filename);
    } finally {
      await manager.cleanup();
    }
  });

program
  .command('restore')
  .description('Restore database from backup')
  .argument('<backup-path>', 'Path to backup file')
  .action(async (backupPath) => {
    const manager = new DatabaseManager();
    try {
      await manager.restoreBackup(backupPath);
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
    } finally {
      await manager.cleanup();
    }
  });

program
  .command('generate')
  .description('Generate new migration')
  .argument('<name>', 'Migration name')
  .action(async (name) => {
    const manager = new DatabaseManager();
    try {
      await manager.generateMigration(name);
    } finally {
      await manager.cleanup();
    }
  });

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error.message);
  process.exit(1);
});

// Parse command line arguments
program.parse();

module.exports = DatabaseManager;
