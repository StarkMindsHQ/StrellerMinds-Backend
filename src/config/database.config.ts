import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Injectable } from '@nestjs/common';

/**
 * Database configuration factory for TypeORM
 * Provides centralized database configuration with connection pooling,
 * retry logic, and environment-specific settings
 */
@Injectable()
export class DatabaseConfig {
    constructor(private configService: ConfigService) { }

    /**
     * Create TypeORM configuration with connection pooling and optimization
     */
    createTypeOrmOptions(): TypeOrmModuleOptions {
        const isProduction = this.configService.get('NODE_ENV') === 'production';
        const isDevelopment = this.configService.get('NODE_ENV') === 'development';

        return {
            type: 'postgres',
            host: this.configService.get('DATABASE_HOST', 'localhost'),
            port: this.configService.get<number>('DATABASE_PORT', 5432),
            username: this.configService.get('DATABASE_USER', 'postgres'),
            password: this.configService.get('DATABASE_PASSWORD'),
            database: this.configService.get('DATABASE_NAME', 'strellerminds'),

            // Connection Pool Configuration
            extra: {
                // Maximum number of connections in the pool
                max: this.configService.get<number>('DATABASE_POOL_MAX', 10),
                // Minimum number of connections in the pool
                min: this.configService.get<number>('DATABASE_POOL_MIN', 1),
                // Maximum time (ms) a connection can be idle before being released
                idleTimeoutMillis: this.configService.get<number>(
                    'DATABASE_IDLE_TIMEOUT',
                    30000,
                ),
                // Maximum time (ms) to wait for a connection from the pool
                connectionTimeoutMillis: this.configService.get<number>(
                    'DATABASE_CONNECTION_TIMEOUT',
                    10000,
                ),
                // Enable SSL in production
                ssl: isProduction
                    ? {
                        rejectUnauthorized: this.configService.get<boolean>(
                            'DATABASE_SSL_REJECT_UNAUTHORIZED',
                            true,
                        ),
                    }
                    : false,
                // Statement timeout (30 seconds)
                statement_timeout: this.configService.get<number>(
                    'DATABASE_STATEMENT_TIMEOUT',
                    30000,
                ),
            },

            // Entity auto-loading
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],

            // Migration configuration
            migrations: [__dirname + '/../migrations/*{.ts,.js}'],
            migrationsRun: this.configService.get<boolean>(
                'DATABASE_RUN_MIGRATIONS',
                false,
            ),
            migrationsTableName: 'migrations',

            // Synchronize schema (only in development)
            synchronize: isDevelopment && this.configService.get<boolean>(
                'DATABASE_SYNCHRONIZE',
                false,
            ),

            // Logging configuration
            logging: this.getLoggingConfig(),
            logger: 'advanced-console',

            // Retry connection attempts
            retryAttempts: this.configService.get<number>(
                'DATABASE_RETRY_ATTEMPTS',
                5,
            ),
            retryDelay: this.configService.get<number>('DATABASE_RETRY_DELAY', 3000),

            // Auto-load entities
            autoLoadEntities: true,

            // Enable query result caching
            cache: {
                type: 'database',
                tableName: 'query_result_cache',
                duration: 60000, // 1 minute default cache
            },

            // Naming strategy for database columns
            namingStrategy: undefined, // Use default snake_case naming
        };
    }

    /**
     * Get logging configuration based on environment
     */
    private getLoggingConfig(): boolean | ('query' | 'error' | 'schema' | 'warn' | 'info' | 'log' | 'migration')[] {
        const logLevel = this.configService.get('LOG_LEVEL', 'info');
        const isDevelopment = this.configService.get('NODE_ENV') === 'development';

        if (isDevelopment) {
            return ['query', 'error', 'warn', 'migration'];
        }

        // Production: only log errors and migrations
        if (logLevel === 'debug') {
            return ['query', 'error', 'warn', 'schema', 'migration'];
        }

        return ['error', 'migration'];
    }
}

/**
 * Create DataSource for TypeORM CLI (migrations, etc.)
 * This is used by TypeORM CLI commands
 */
export const createDataSourceOptions = (): DataSourceOptions => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';

    return {
        type: 'postgres',
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME || 'strellerminds',

        // Connection Pool
        extra: {
            max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
            min: parseInt(process.env.DATABASE_POOL_MIN || '1'),
            idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'),
            connectionTimeoutMillis: parseInt(
                process.env.DATABASE_CONNECTION_TIMEOUT || '10000',
            ),
            ssl: isProduction
                ? {
                    rejectUnauthorized:
                        process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
                }
                : false,
        },

        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../migrations/*{.ts,.js}'],
        migrationsTableName: 'migrations',

        synchronize: false, // Never use synchronize in CLI

        logging: isDevelopment ? ['query', 'error', 'warn', 'migration'] : ['error', 'migration'],
    };
};

// Export DataSource for TypeORM CLI
export const AppDataSource = new DataSource(createDataSourceOptions());
