import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config();

/**
 * TypeORM DataSource configuration for CLI commands
 * Used by: typeorm migration:generate, migration:run, etc.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME || 'strellerminds',

  // Entity paths
  entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],

  // Migration paths
  migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
  migrationsTableName: 'migrations',

  // Never use synchronize in production
  synchronize: false,

  // Logging
  logging:
    process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn', 'migration']
      : ['error', 'migration'],

  // Connection pool settings
  extra: {
    max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
    min: parseInt(process.env.DATABASE_POOL_MIN || '1'),
    idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'),
  },
});

export default AppDataSource;
