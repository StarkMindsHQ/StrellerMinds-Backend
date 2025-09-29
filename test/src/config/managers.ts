import { EventEmitter } from 'events';
import { readFileSync, watchFile, existsSync } from 'fs';
import { resolve } from 'path';
import { AppConfig } from './types';
import { configSchema, environmentSchemas } from './schema';

class ConfigurationManager extends EventEmitter {
  private config: AppConfig | null = null;
  private configPath: string;
  private watching: boolean = false;
  private version: string = '1.0.0';

  constructor(configPath?: string) {
    super();
    this.configPath = configPath || this.resolveConfigPath();
    this.loadConfiguration();
  }

  private resolveConfigPath(): string {
    const env = process.env.NODE_ENV || 'development';
    const possiblePaths = [
      resolve(process.cwd(), `config/${env}.json`),
      resolve(process.cwd(), `config/${env}.yaml`),
      resolve(process.cwd(), `config/default.json`),
      resolve(process.cwd(), 'config.json'),
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    throw new Error('No configuration file found');
  }

  private loadConfiguration(): void {
    try {
      const configData = this.readConfigFile();
      this.validateConfiguration(configData);
      this.config = configData;
      this.version = this.generateVersion();
      this.emit('configLoaded', this.config);
    } catch (error) {
      this.emit('configError', error);
      throw error;
    }
  }

  private readConfigFile(): AppConfig {
    const content = readFileSync(this.configPath, 'utf8');

    if (this.configPath.endsWith('.json')) {
      return JSON.parse(content);
    } else if (
      this.configPath.endsWith('.yaml') ||
      this.configPath.endsWith('.yml')
    ) {
      // You would need to install yaml parser
      // const yaml = require('yaml');
      // return yaml.parse(content);
      throw new Error('YAML support not implemented in this example');
    }

    throw new Error('Unsupported configuration file format');
  }

  private validateConfiguration(config: any): void {
    const environment =
      config.app?.environment || process.env.NODE_ENV || 'development';

    // General validation
    const { error: generalError } = configSchema.validate(config, {
      abortEarly: false,
    });
    if (generalError) {
      throw new Error(
        `Configuration validation failed: ${generalError.message}`,
      );
    }

    // Environment-specific validation
    const envSchema =
      environmentSchemas[environment as keyof typeof environmentSchemas];
    if (envSchema) {
      const { error: envError } = envSchema.validate(config, {
        abortEarly: false,
      });
      if (envError) {
        throw new Error(
          `Environment-specific validation failed: ${envError.message}`,
        );
      }
    }
  }

  private generateVersion(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    return { ...this.config }; // Return a copy to prevent mutations
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
    if (this.watching) {
      return;
    }

    this.watching = true;
    watchFile(this.configPath, { interval: 1000 }, () => {
      try {
        console.log('Configuration file changed, reloading...');
        this.loadConfiguration();
        this.emit('configReloaded', this.config);
      } catch (error) {
        console.error('Failed to reload configuration:', error);
        this.emit('configError', error);
      }
    });
  }

  public disableHotReload(): void {
    if (!this.watching) {
      return;
    }

    this.watching = false;
    // Note: Node.js doesn't provide a direct way to stop watching
    // You might need to use fs.unwatchFile or a different approach
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

    // Validate database connection settings
    if (environment === 'production' && !this.get('database.ssl')) {
      errors.push('SSL must be enabled for production database connections');
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
