import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigManager } from './ConfigManager';
import { FeatureFlags } from './FeatureFlags';
import { ConfigEnvironment, ConfigType } from '../models/Configuration';

export interface EnvironmentConfigData {
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
    ssl: boolean;
    maxConnections: number;
    connectionTimeout: number;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    maxRetriesPerRequest: number;
    retryDelayOnFailover: number;
  };
  aws: {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    s3Bucket?: string;
    secretsManager?: {
      secretName: string;
      region: string;
    };
  };
  security: {
    jwtSecret: string;
    jwtExpiration: string;
    bcryptRounds: number;
    rateLimitWindow: number;
    rateLimitMax: number;
    corsOrigins: string[];
  };
  monitoring: {
    enableMetrics: boolean;
    enableTracing: boolean;
    logLevel: string;
    healthCheckInterval: number;
  };
  cache: {
    ttl: number;
    maxSize: number;
    enableCompression: boolean;
  };
  features: {
    enableWebhooks: boolean;
    enableRealTime: boolean;
    enableAnalytics: boolean;
    enableNotifications: boolean;
  };
}

@Injectable()
export class EnvironmentConfig {
  private readonly logger = new Logger(EnvironmentConfig.name);
  private currentEnvironment: ConfigEnvironment;
  private configCache = new Map<string, any>();
  private lastCacheUpdate = new Map<string, Date>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor(
    private configService: ConfigService,
    private configManager: ConfigManager,
    private featureFlags: FeatureFlags,
  ) {
    this.currentEnvironment = this.determineEnvironment();
    this.initializeDefaultConfigs();
  }

  private determineEnvironment(): ConfigEnvironment {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    
    switch (nodeEnv.toLowerCase()) {
      case 'production':
        return ConfigEnvironment.PRODUCTION;
      case 'staging':
        return ConfigEnvironment.STAGING;
      case 'development':
      default:
        return ConfigEnvironment.DEVELOPMENT;
    }
  }

  private async initializeDefaultConfigs(): Promise<void> {
    const defaultConfigs: Record<string, any> = {
      // Database configurations
      'database.host': this.configService.get<string>('DATABASE_HOST', 'localhost'),
      'database.port': this.configService.get<number>('DATABASE_PORT', 5432),
      'database.username': this.configService.get<string>('DATABASE_USERNAME', 'postgres'),
      'database.password': this.configService.get<string>('DATABASE_PASSWORD', ''),
      'database.name': this.configService.get<string>('DATABASE_NAME', 'strellerminds'),
      'database.ssl': this.configService.get<boolean>('DATABASE_SSL', false),
      'database.maxConnections': this.configService.get<number>('DATABASE_MAX_CONNECTIONS', 10),
      'database.connectionTimeout': this.configService.get<number>('DATABASE_CONNECTION_TIMEOUT', 30000),

      // Redis configurations
      'redis.host': this.configService.get<string>('REDIS_HOST', 'localhost'),
      'redis.port': this.configService.get<number>('REDIS_PORT', 6379),
      'redis.password': this.configService.get<string>('REDIS_PASSWORD', ''),
      'redis.db': this.configService.get<number>('REDIS_DB', 0),
      'redis.maxRetriesPerRequest': this.configService.get<number>('REDIS_MAX_RETRIES', 3),
      'redis.retryDelayOnFailover': this.configService.get<number>('REDIS_RETRY_DELAY', 100),

      // AWS configurations
      'aws.region': this.configService.get<string>('AWS_REGION', 'us-east-1'),
      'aws.accessKeyId': this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
      'aws.secretAccessKey': this.configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      'aws.s3Bucket': this.configService.get<string>('AWS_S3_BUCKET', ''),
      'aws.secretsManager.secretName': this.configService.get<string>('AWS_SECRET_NAME', ''),
      'aws.secretsManager.region': this.configService.get<string>('AWS_SECRET_REGION', 'us-east-1'),

      // Security configurations
      'security.jwtSecret': this.configService.get<string>('JWT_SECRET', 'default-secret-change-me'),
      'security.jwtExpiration': this.configService.get<string>('JWT_EXPIRATION', '24h'),
      'security.bcryptRounds': this.configService.get<number>('BCRYPT_ROUNDS', 12),
      'security.rateLimitWindow': this.configService.get<number>('RATE_LIMIT_WINDOW', 900000), // 15 minutes
      'security.rateLimitMax': this.configService.get<number>('RATE_LIMIT_MAX', 100),
      'security.corsOrigins': this.configService.get<string[]>('CORS_ORIGINS', ['http://localhost:3000']),

      // Monitoring configurations
      'monitoring.enableMetrics': this.configService.get<boolean>('ENABLE_METRICS', true),
      'monitoring.enableTracing': this.configService.get<boolean>('ENABLE_TRACING', true),
      'monitoring.logLevel': this.configService.get<string>('LOG_LEVEL', 'info'),
      'monitoring.healthCheckInterval': this.configService.get<number>('HEALTH_CHECK_INTERVAL', 30000),

      // Cache configurations
      'cache.ttl': this.configService.get<number>('CACHE_TTL', 300000), // 5 minutes
      'cache.maxSize': this.configService.get<number>('CACHE_MAX_SIZE', 1000),
      'cache.enableCompression': this.configService.get<boolean>('CACHE_COMPRESSION', true),

      // Feature configurations
      'features.enableWebhooks': this.configService.get<boolean>('ENABLE_WEBHOOKS', true),
      'features.enableRealTime': this.configService.get<boolean>('ENABLE_REALTIME', true),
      'features.enableAnalytics': this.configService.get<boolean>('ENABLE_ANALYTICS', true),
      'features.enableNotifications': this.configService.get<boolean>('ENABLE_NOTIFICATIONS', true),
    };

    // Create default configurations if they don't exist
    for (const [key, value] of Object.entries(defaultConfigs)) {
      try {
        await this.configManager.getConfig(key, this.currentEnvironment);
      } catch (error) {
        // Config doesn't exist, create it
        const type = this.determineConfigType(value);
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        try {
          await this.configManager.createConfig(
            key,
            type,
            stringValue,
            this.currentEnvironment,
            {
              category: this.getCategoryFromKey(key),
              description: this.getDescriptionFromKey(key),
              isEncrypted: this.shouldEncrypt(key),
              requiresRestart: this.requiresRestart(key),
            },
            'system',
          );
        } catch (error) {
          // Config might already be being created, ignore
        }
      }
    }

    this.logger.log(`Initialized default configurations for ${this.currentEnvironment}`);
  }

  async getEnvironmentConfig(): Promise<EnvironmentConfigData> {
    const config: Partial<EnvironmentConfigData> = {};

    try {
      // Database configuration
      config.database = {
        host: await this.getConfigValue('database.host', 'localhost'),
        port: await this.getConfigValue('database.port', 5432),
        username: await this.getConfigValue('database.username', 'postgres'),
        password: await this.getConfigValue('database.password', ''),
        name: await this.getConfigValue('database.name', 'strellerminds'),
        ssl: await this.getConfigValue('database.ssl', false),
        maxConnections: await this.getConfigValue('database.maxConnections', 10),
        connectionTimeout: await this.getConfigValue('database.connectionTimeout', 30000),
      };

      // Redis configuration
      config.redis = {
        host: await this.getConfigValue('redis.host', 'localhost'),
        port: await this.getConfigValue('redis.port', 6379),
        password: await this.getConfigValue('redis.password', undefined),
        db: await this.getConfigValue('redis.db', 0),
        maxRetriesPerRequest: await this.getConfigValue('redis.maxRetriesPerRequest', 3),
        retryDelayOnFailover: await this.getConfigValue('redis.retryDelayOnFailover', 100),
      };

      // AWS configuration
      config.aws = {
        region: await this.getConfigValue('aws.region', 'us-east-1'),
        accessKeyId: await this.getConfigValue('aws.accessKeyId', undefined),
        secretAccessKey: await this.getConfigValue('aws.secretAccessKey', undefined),
        s3Bucket: await this.getConfigValue('aws.s3Bucket', undefined),
        secretsManager: {
          secretName: await this.getConfigValue('aws.secretsManager.secretName', ''),
          region: await this.getConfigValue('aws.secretsManager.region', 'us-east-1'),
        },
      };

      // Security configuration
      config.security = {
        jwtSecret: await this.getConfigValue('security.jwtSecret', 'default-secret-change-me'),
        jwtExpiration: await this.getConfigValue('security.jwtExpiration', '24h'),
        bcryptRounds: await this.getConfigValue('security.bcryptRounds', 12),
        rateLimitWindow: await this.getConfigValue('security.rateLimitWindow', 900000),
        rateLimitMax: await this.getConfigValue('security.rateLimitMax', 100),
        corsOrigins: await this.getConfigValue('security.corsOrigins', ['http://localhost:3000']),
      };

      // Monitoring configuration
      config.monitoring = {
        enableMetrics: await this.getConfigValue('monitoring.enableMetrics', true),
        enableTracing: await this.getConfigValue('monitoring.enableTracing', true),
        logLevel: await this.getConfigValue('monitoring.logLevel', 'info'),
        healthCheckInterval: await this.getConfigValue('monitoring.healthCheckInterval', 30000),
      };

      // Cache configuration
      config.cache = {
        ttl: await this.getConfigValue('cache.ttl', 300000),
        maxSize: await this.getConfigValue('cache.maxSize', 1000),
        enableCompression: await this.getConfigValue('cache.enableCompression', true),
      };

      // Features configuration
      config.features = {
        enableWebhooks: await this.getConfigValue('features.enableWebhooks', true),
        enableRealTime: await this.getConfigValue('features.enableRealTime', true),
        enableAnalytics: await this.getConfigValue('features.enableAnalytics', true),
        enableNotifications: await this.getConfigValue('features.enableNotifications', true),
      };

      return config as EnvironmentConfigData;
    } catch (error) {
      this.logger.error('Failed to load environment configuration', error);
      throw error;
    }
  }

  async getConfigValue<T>(key: string, defaultValue: T): Promise<T> {
    const cacheKey = `${key}:${this.currentEnvironment}`;
    
    // Check cache first
    if (this.configCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      return this.configCache.get(cacheKey) as T;
    }

    try {
      const config = await this.configManager.getConfig(key, this.currentEnvironment);
      let value: any = config.value;

      // Parse based on type
      switch (config.type) {
        case ConfigType.NUMBER:
          value = Number(value);
          break;
        case ConfigType.BOOLEAN:
          value = value === 'true';
          break;
        case ConfigType.JSON:
        case ConfigType.ARRAY:
          value = JSON.parse(value);
          break;
        default:
          // Keep as string
          break;
      }

      // Cache the value
      this.configCache.set(cacheKey, value);
      this.lastCacheUpdate.set(cacheKey, new Date());

      return value as T;
    } catch (error) {
      // Return default value if config not found
      this.configCache.set(cacheKey, defaultValue);
      this.lastCacheUpdate.set(cacheKey, new Date());
      return defaultValue;
    }
  }

  async updateConfigValue(key: string, value: any, userId: string): Promise<void> {
    const type = this.determineConfigType(value);
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    await this.configManager.updateConfig(
      key,
      this.currentEnvironment,
      { value: stringValue },
      userId,
    );

    // Invalidate cache
    const cacheKey = `${key}:${this.currentEnvironment}`;
    this.configCache.delete(cacheKey);
    this.lastCacheUpdate.delete(cacheKey);

    this.logger.log(`Updated config value: ${key} for ${this.currentEnvironment}`);
  }

  async isFeatureEnabled(featureName: string, context?: any): Promise<boolean> {
    return this.featureFlags.isFeatureEnabled(featureName, this.currentEnvironment, context);
  }

  getCurrentEnvironment(): ConfigEnvironment {
    return this.currentEnvironment;
  }

  async validateEnvironmentConfig(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const config = await this.getEnvironmentConfig();

    // Validate required fields
    if (!config.database.host) {
      errors.push('Database host is required');
    }
    if (!config.database.username) {
      errors.push('Database username is required');
    }
    if (!config.database.name) {
      errors.push('Database name is required');
    }
    if (!config.security.jwtSecret || config.security.jwtSecret === 'default-secret-change-me') {
      errors.push('JWT secret must be set to a secure value');
    }

    // Validate ranges
    if (config.database.port < 1 || config.database.port > 65535) {
      errors.push('Database port must be between 1 and 65535');
    }
    if (config.redis.port < 1 || config.redis.port > 65535) {
      errors.push('Redis port must be between 1 and 65535');
    }
    if (config.security.bcryptRounds < 10 || config.security.bcryptRounds > 15) {
      errors.push('Bcrypt rounds should be between 10 and 15');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async exportEnvironmentConfig(): Promise<Record<string, any>> {
    return this.configManager.exportConfigurations(this.currentEnvironment);
  }

  async importEnvironmentConfig(configData: Record<string, any>, userId: string): Promise<void> {
    await this.configManager.importConfigurations(this.currentEnvironment, configData, userId);
    
    // Clear all cache
    this.configCache.clear();
    this.lastCacheUpdate.clear();

    this.logger.log(`Imported configuration data for ${this.currentEnvironment}`);
  }

  async refreshCache(key?: string): Promise<void> {
    if (key) {
      const cacheKey = `${key}:${this.currentEnvironment}`;
      this.configCache.delete(cacheKey);
      this.lastCacheUpdate.delete(cacheKey);
    } else {
      this.configCache.clear();
      this.lastCacheUpdate.clear();
    }
  }

  private determineConfigType(value: any): ConfigType {
    if (typeof value === 'number') return ConfigType.NUMBER;
    if (typeof value === 'boolean') return ConfigType.BOOLEAN;
    if (Array.isArray(value)) return ConfigType.ARRAY;
    if (typeof value === 'object' && value !== null) return ConfigType.JSON;
    return ConfigType.STRING;
  }

  private getCategoryFromKey(key: string): string {
    const parts = key.split('.');
    return parts[0] || 'general';
  }

  private getDescriptionFromKey(key: string): string {
    const descriptions: Record<string, string> = {
      'database.host': 'Database server hostname',
      'database.port': 'Database server port',
      'database.username': 'Database connection username',
      'database.password': 'Database connection password',
      'database.name': 'Database name',
      'database.ssl': 'Enable SSL for database connections',
      'database.maxConnections': 'Maximum number of database connections',
      'database.connectionTimeout': 'Database connection timeout in milliseconds',
      'redis.host': 'Redis server hostname',
      'redis.port': 'Redis server port',
      'redis.password': 'Redis connection password',
      'redis.db': 'Redis database number',
      'aws.region': 'AWS region for services',
      'aws.accessKeyId': 'AWS access key ID',
      'aws.secretAccessKey': 'AWS secret access key',
      'aws.s3Bucket': 'AWS S3 bucket name',
      'security.jwtSecret': 'JWT signing secret',
      'security.jwtExpiration': 'JWT token expiration time',
      'security.bcryptRounds': 'Number of bcrypt hashing rounds',
      'security.rateLimitWindow': 'Rate limiting window in milliseconds',
      'security.rateLimitMax': 'Maximum requests per rate limit window',
      'security.corsOrigins': 'Allowed CORS origins',
      'monitoring.enableMetrics': 'Enable application metrics collection',
      'monitoring.enableTracing': 'Enable distributed tracing',
      'monitoring.logLevel': 'Application log level',
      'monitoring.healthCheckInterval': 'Health check interval in milliseconds',
      'cache.ttl': 'Cache time-to-live in milliseconds',
      'cache.maxSize': 'Maximum cache size',
      'cache.enableCompression': 'Enable cache compression',
      'features.enableWebhooks': 'Enable webhook functionality',
      'features.enableRealTime': 'Enable real-time features',
      'features.enableAnalytics': 'Enable analytics collection',
      'features.enableNotifications': 'Enable notification system',
    };

    return descriptions[key] || `Configuration for ${key}`;
  }

  private shouldEncrypt(key: string): boolean {
    const sensitiveKeys = [
      'database.password',
      'redis.password',
      'aws.accessKeyId',
      'aws.secretAccessKey',
      'security.jwtSecret',
    ];

    return sensitiveKeys.includes(key);
  }

  private requiresRestart(key: string): boolean {
    const restartRequiredKeys = [
      'database.host',
      'database.port',
      'database.name',
      'redis.host',
      'redis.port',
      'redis.db',
      'aws.region',
    ];

    return restartRequiredKeys.includes(key);
  }

  private isCacheValid(cacheKey: string): boolean {
    const lastUpdate = this.lastCacheUpdate.get(cacheKey);
    return lastUpdate && (Date.now() - lastUpdate.getTime()) < this.CACHE_TTL;
  }

  async getCacheStats(): Promise<{ size: number; keys: string[] }> {
    return {
      size: this.configCache.size,
      keys: Array.from(this.configCache.keys()),
    };
  }
}
