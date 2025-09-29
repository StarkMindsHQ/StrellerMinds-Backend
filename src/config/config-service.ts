import { Injectable, Logger } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { readFileSync, watchFile, existsSync } from 'fs';
import { resolve } from 'path';
import { EventEmitter } from 'events';
import { AppConfig } from './types';
import { SecretsManager } from './secrets-manager';
import { ConfigValidator } from './config-validator';

@Injectable()
export class ConfigurationService extends EventEmitter {
  private readonly logger = new Logger(ConfigurationService.name);
  private config: AppConfig | null = null;
  private configPath: string;
  private watching: boolean = false;
  private version: string = '1.0.0';
  private secretsManager: SecretsManager;
  private sensitiveKeys = ['password', 'secret', 'key', 'token', 'credentials', 'apikey'];

  constructor(private nestConfigService: NestConfigService) {
    super();
    this.secretsManager = new SecretsManager();
    this.configPath = this.resolveConfigPath();
    this.loadConfiguration();
  }

  private resolveConfigPath(): string {
    const env = process.env.NODE_ENV || 'development';
    const possiblePaths = [
      resolve(process.cwd(), `config/${env}.json`),
      resolve(process.cwd(), `src/config/${env}.json`),
      resolve(process.cwd(), `config/default.json`),
      resolve(process.cwd(), 'config.json'),
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    // Return default path if no config file found
    return resolve(process.cwd(), `config/${env}.json`);
  }

  private loadConfiguration(): void {
    try {
      if (existsSync(this.configPath)) {
        const configData = this.readConfigFile();
        this.config = configData;
      } else {
        // Use environment variables and defaults
        this.config = this.buildConfigFromEnv();
      }

      // Validate configuration
      const validationResult = ConfigValidator.validate(this.config as any);
      ConfigValidator.logValidationResults(validationResult);

      if (!validationResult.isValid) {
        throw new Error('Configuration validation failed. Check logs for details.');
      }

      this.version = this.generateVersion();
      this.emit('configLoaded', this.config);
      this.logger.log('Configuration loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load configuration', error);
      this.emit('configError', error);
      throw error;
    }
  }

  private readConfigFile(): AppConfig {
    const content = readFileSync(this.configPath, 'utf8');
    return JSON.parse(content);
  }

  private buildConfigFromEnv(): AppConfig {
    return {
      app: {
        name: process.env.APP_NAME || 'my-app',
        version: process.env.APP_VERSION || '1.0.0',
        environment: (process.env.NODE_ENV as any) || 'development',
      },
      server: {
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || '0.0.0.0',
        cors: {
          enabled: process.env.CORS_ENABLED === 'true',
          origins: process.env.CORS_ORIGINS?.split(',') || ['*'],
        },
        rateLimit: {
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
          maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        },
      },
      database: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        username: process.env.DATABASE_USERNAME || 'postgres',
        password: this.secretsManager.getSecret('DATABASE_PASSWORD') || process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'myapp',
        ssl: process.env.DATABASE_SSL === 'true',
        maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10'),
        timeout: parseInt(process.env.DATABASE_TIMEOUT || '30000'),
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: this.secretsManager.getSecret('REDIS_PASSWORD') || process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
      },
      logging: {
        level: (process.env.LOG_LEVEL as any) || 'info',
        format: (process.env.LOG_FORMAT as any) || 'json',
        file: {
          enabled: process.env.LOG_FILE_ENABLED === 'true',
          path: process.env.LOG_FILE_PATH || 'logs/app.log',
          maxSize: process.env.LOG_FILE_MAX_SIZE || '10MB',
          maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES || '5'),
        },
      },
      features: this.parseFeatures(process.env.FEATURES),
    };
  }

  private parseFeatures(featuresString?: string): { [key: string]: boolean } {
    if (!featuresString) return {};

    try {
      return JSON.parse(featuresString);
    } catch {
      return {};
    }
  }

  private generateVersion(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    return { ...this.config };
  }

  public get<T = any>(path: string, defaultValue?: T): T {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    const keys = path.split('.');
    let current: any = this.config;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue as T;
      }
    }

    return current as T;
  }

  public getVersion(): string {
    return this.version;
  }

  public enableHotReload(): void {
    if (this.watching || !existsSync(this.configPath)) {
      return;
    }

    this.watching = true;
    watchFile(this.configPath, { interval: 1000 }, () => {
      try {
        this.logger.log('Configuration file changed, reloading non-sensitive settings...');
        const oldConfig = { ...this.config };
        this.loadConfiguration();

        // Only reload non-sensitive settings
        if (oldConfig && this.config) {
          // Preserve sensitive settings from being hot-reloaded
          this.config.database.password = oldConfig.database.password;
          this.config.redis.password = oldConfig.redis.password;
        }

        this.emit('configReloaded', this.config);
      } catch (error) {
        this.logger.error('Failed to reload configuration:', error);
        this.emit('configError', error);
      }
    });
  }

  public disableHotReload(): void {
    this.watching = false;
  }

  public validateEnvironment(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const environment = this.get('app.environment');

    // Check required environment variables
    const requiredEnvVars = this.getRequiredEnvVars(environment);
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        errors.push(`Missing required environment variable: ${envVar}`);
      }
    }

    // Environment-specific validation
    if (environment === 'production') {
      if (!this.get('database.ssl')) {
        errors.push('SSL must be enabled for production database connections');
      }
      if (this.get('logging.level') === 'debug') {
        errors.push('Debug logging should not be enabled in production');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private getRequiredEnvVars(environment: string): string[] {
    const baseVars = ['NODE_ENV'];

    switch (environment) {
      case 'production':
        return [...baseVars, 'DATABASE_PASSWORD', 'REDIS_PASSWORD'];
      case 'staging':
        return [...baseVars, 'DATABASE_PASSWORD'];
      default:
        return baseVars;
    }
  }
}
