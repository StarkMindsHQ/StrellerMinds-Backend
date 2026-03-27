import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { CustomTypeOrmLogger } from 'src/database/typeorm-logger';
import { performance } from 'perf_hooks';

/**
 * Database configuration factory for TypeORM
 * Provides centralized database configuration with connection pooling,
 * retry logic, and environment-specific settings
 */
@Injectable()
export class DatabaseConfig {
  private readonly logger = new Logger(DatabaseConfig.name);
  private poolMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingClients: 0,
    lastMetricsUpdate: new Date(),
  };

  constructor(private configService: ConfigService) {}

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

      // Enhanced Connection Pool Configuration
      extra: {
        // Dynamic pool sizing based on environment and load
        max: this.getOptimalMaxConnections(),
        min: this.getOptimalMinConnections(),
        
        // Connection lifecycle management
        idleTimeoutMillis: this.configService.get<number>('DATABASE_IDLE_TIMEOUT', 30000),
        connectionTimeoutMillis: this.configService.get<number>(
          'DATABASE_CONNECTION_TIMEOUT',
          10000,
        ),
        
        // Advanced pool settings for production
        acquireTimeoutMillis: this.configService.get<number>('DATABASE_ACQUIRE_TIMEOUT', 60000),
        createTimeoutMillis: this.configService.get<number>('DATABASE_CREATE_TIMEOUT', 30000),
        destroyTimeoutMillis: this.configService.get<number>('DATABASE_DESTROY_TIMEOUT', 5000),
        reapIntervalMillis: this.configService.get<number>('DATABASE_REAP_INTERVAL', 1000),
        createRetryIntervalMillis: this.configService.get<number>('DATABASE_CREATE_RETRY_INTERVAL', 200),
        
        // Connection validation and health checks
        validate: this.configService.get<boolean>('DATABASE_VALIDATE_CONNECTIONS', true),
        onConnect: this.configService.get<boolean>('DATABASE_RUN_ON_CONNECT', true),
        
        // SSL configuration
        ssl: isProduction
          ? {
              rejectUnauthorized: this.configService.get<boolean>(
                'DATABASE_SSL_REJECT_UNAUTHORIZED',
                true,
              ),
              cert: this.configService.get('DATABASE_SSL_CERT'),
              key: this.configService.get('DATABASE_SSL_KEY'),
              ca: this.configService.get('DATABASE_SSL_CA'),
            }
          : false,
          
        // Performance tuning
        statement_timeout: this.configService.get<number>('DATABASE_STATEMENT_TIMEOUT', 30000),
        query_timeout: this.configService.get<number>('DATABASE_QUERY_TIMEOUT', 30000),
        application_name: this.configService.get('DATABASE_APP_NAME', 'strellerminds-backend'),
        
        // Connection pool monitoring
        poolLog: isProduction ? false : this.configService.get<boolean>('DATABASE_POOL_LOG', true),
        maxUses: this.configService.get<number>('DATABASE_CONNECTION_MAX_USES', 10000),
      },

      // Entity auto-loading
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],

      // Migration configuration
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      migrationsRun: this.configService.get<boolean>('DATABASE_RUN_MIGRATIONS', false),
      migrationsTableName: 'migrations',

      // Synchronize schema (only in development)
      synchronize: isDevelopment && this.configService.get<boolean>('DATABASE_SYNCHRONIZE', false),

      // Logging configuration
      logging: this.getLoggingConfig(),
      logger: 'advanced-console',

      // Retry connection attempts
      retryAttempts: this.configService.get<number>('DATABASE_RETRY_ATTEMPTS', 5),
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
  private getLoggingConfig():
    | boolean
    | ('query' | 'error' | 'schema' | 'warn' | 'info' | 'log' | 'migration')[] {
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

  /**
   * Calculate optimal maximum connections based on system resources and environment
   */
  private getOptimalMaxConnections(): number {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const isDevelopment = this.configService.get('NODE_ENV') === 'development';
    
    // Environment-specific defaults
    const defaultMax = isProduction ? 20 : isDevelopment ? 5 : 10;
    const configuredMax = this.configService.get<number>('DATABASE_POOL_MAX', defaultMax);
    
    // Calculate based on available CPU cores (conservative estimate)
    const cpuCount = require('os').cpus().length;
    const cpuBasedMax = Math.min(cpuCount * 4, 50); // Max 4 connections per CPU core, capped at 50
    
    // Use the minimum of configured and calculated values for safety
    return Math.min(configuredMax, cpuBasedMax);
  }

  /**
   * Calculate optimal minimum connections based on environment and expected load
   */
  private getOptimalMinConnections(): number {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const isDevelopment = this.configService.get('NODE_ENV') === 'development';
    
    // Environment-specific defaults
    const defaultMin = isProduction ? 2 : isDevelopment ? 1 : 2;
    const configuredMin = this.configService.get<number>('DATABASE_POOL_MIN', defaultMin);
    
    const maxConnections = this.getOptimalMaxConnections();
    
    // Ensure min is reasonable relative to max (20-40% of max)
    const calculatedMin = Math.max(1, Math.floor(maxConnections * 0.2));
    
    return Math.min(configuredMin, calculatedMin);
  }

  /**
   * Get current pool metrics for monitoring
   */
  getPoolMetrics() {
    return {
      ...this.poolMetrics,
      timestamp: new Date(),
    };
  }

  /**
   * Update pool metrics (called by monitoring service)
   */
  updatePoolMetrics(metrics: Partial<typeof this.poolMetrics>) {
    this.poolMetrics = {
      ...this.poolMetrics,
      ...metrics,
      lastMetricsUpdate: new Date(),
    };
  }

  /**
   * Perform connection health check
   */
  async performHealthCheck(dataSource: DataSource): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const startTime = performance.now();
    
    try {
      await dataSource.query('SELECT 1 as health_check');
      const latency = Math.round(performance.now() - startTime);
      
      return {
        healthy: true,
        latency,
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Math.round(performance.now() - startTime),
        error: error.message,
      };
    }
  }

  /**
   * Get pool performance recommendations
   */
  getPoolRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.poolMetrics;
    
    if (metrics.waitingClients > 5) {
      recommendations.push('Consider increasing DATABASE_POOL_MAX to reduce waiting clients');
    }
    
    if (metrics.activeConnections / metrics.totalConnections > 0.8) {
      recommendations.push('High connection utilization detected - consider scaling up the database');
    }
    
    if (metrics.idleConnections > metrics.activeConnections * 2) {
      recommendations.push('Many idle connections - consider reducing DATABASE_POOL_MIN');
    }
    
    return recommendations;
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

    // Enhanced Connection Pool for CLI
    extra: {
      max: parseInt(process.env.DATABASE_POOL_MAX || '20'),
      min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
      idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '10000'),
      acquireTimeoutMillis: parseInt(process.env.DATABASE_ACQUIRE_TIMEOUT || '60000'),
      createTimeoutMillis: parseInt(process.env.DATABASE_CREATE_TIMEOUT || '30000'),
      destroyTimeoutMillis: parseInt(process.env.DATABASE_DESTROY_TIMEOUT || '5000'),
      reapIntervalMillis: parseInt(process.env.DATABASE_REAP_INTERVAL || '1000'),
      createRetryIntervalMillis: parseInt(process.env.DATABASE_CREATE_RETRY_INTERVAL || '200'),
      validate: process.env.DATABASE_VALIDATE_CONNECTIONS === 'true',
      application_name: process.env.DATABASE_APP_NAME || 'strellerminds-backend-cli',
      maxUses: parseInt(process.env.DATABASE_CONNECTION_MAX_USES || '10000'),
      ssl: isProduction
        ? {
            rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
            cert: process.env.DATABASE_SSL_CERT,
            key: process.env.DATABASE_SSL_KEY,
            ca: process.env.DATABASE_SSL_CA,
          }
        : false,
    },

    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    migrationsTableName: 'migrations',

    synchronize: false, // Never use synchronize in CLI
    logger: new CustomTypeOrmLogger(),
    logging: isDevelopment ? ['query', 'error', 'warn', 'migration'] : ['error', 'migration'],
    maxQueryExecutionTime: 200, // ms threshold for slow query logging
  };
};

// Export DataSource for TypeORM CLI
export const AppDataSource = new DataSource(createDataSourceOptions());
