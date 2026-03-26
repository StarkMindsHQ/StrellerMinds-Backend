import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TestDatabaseService {
  private readonly logger = new Logger(TestDatabaseService.name);
  private dataSource: DataSource;

  constructor(private configService: ConfigService) {}

  /**
   * Initialize test database connection
   */
  async initialize(): Promise<DataSource> {
    if (this.dataSource && this.dataSource.isInitialized) {
      return this.dataSource;
    }

    this.logger.log('Initializing test database connection...');
    
    this.dataSource = new DataSource({
      type: 'postgres',
      host: this.configService.get('TEST_DB_HOST', 'localhost'),
      port: this.configService.get('TEST_DB_PORT', 5433),
      username: this.configService.get('TEST_DB_USERNAME', 'test_user'),
      password: this.configService.get('TEST_DB_PASSWORD', 'test_password'),
      database: this.configService.get('TEST_DB_NAME', 'strellerminds_test'),
      entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
      synchronize: true,
      logging: false,
      dropSchema: true,
    });

    await this.dataSource.initialize();
    this.logger.log('Test database connected successfully');
    
    return this.dataSource;
  }

  /**
   * Get the data source instance
   */
  getDataSource(): DataSource {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      throw new Error('Test database not initialized. Call initialize() first.');
    }
    return this.dataSource;
  }

  /**
   * Close test database connection
   */
  async close(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      this.logger.log('Test database connection closed');
    }
  }

  /**
   * Create a test-specific schema for isolation
   */
  async createTestSchema(testId: string): Promise<void> {
    const schemaName = `test_${testId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    const queryRunner = this.getDataSource().createQueryRunner();
    
    try {
      await queryRunner.createSchema(schemaName, true);
      this.logger.log(`Created test schema: ${schemaName}`);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Drop test-specific schema
   */
  async dropTestSchema(testId: string): Promise<void> {
    const schemaName = `test_${testId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    const queryRunner = this.getDataSource().createQueryRunner();
    
    try {
      await queryRunner.dropSchema(schemaName, true, true);
      this.logger.log(`Dropped test schema: ${schemaName}`);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Run migrations for test database
   */
  async runMigrations(): Promise<void> {
    const queryRunner = this.getDataSource().createQueryRunner();
    
    try {
      await queryRunner.runMigrations();
      this.logger.log('Test database migrations completed');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Clear all tables in test database
   */
  async clearDatabase(): Promise<void> {
    const queryRunner = this.getDataSource().createQueryRunner();
    
    try {
      const tables = await queryRunner.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' AND tablename != 'migrations'
      `);
      
      for (const table of tables) {
        await queryRunner.query(`TRUNCATE TABLE "${table.tablename}" CASCADE;`);
      }
      
      this.logger.log('Test database cleared');
    } finally {
      await queryRunner.release();
    }
  }
}
