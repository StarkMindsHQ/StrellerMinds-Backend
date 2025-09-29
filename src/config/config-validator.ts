import { Logger } from '@nestjs/common';
import { validateSync, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { EnvironmentVariables } from './config-validation';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class ConfigValidator {
  private static readonly logger = new Logger(ConfigValidator.name);

  static validate(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate using class-validator
    const validationErrors = this.validateWithClassValidator(config);
    errors.push(...validationErrors);

    // Environment-specific validation
    const environment = config.app?.environment || process.env.NODE_ENV || 'development';
    const envErrors = this.validateEnvironmentSpecific(config, environment);
    errors.push(...envErrors);

    // Security checks
    const securityWarnings = this.validateSecurity(config, environment);
    warnings.push(...securityWarnings);

    // Cross-field validation
    const crossFieldErrors = this.validateCrossFields(config);
    errors.push(...crossFieldErrors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static validateWithClassValidator(config: Record<string, any>): string[] {
    const errors: string[] = [];

    try {
      const validatedConfig = plainToClass(EnvironmentVariables, config, {
        enableImplicitConversion: true,
      });

      const validationErrors: ValidationError[] = validateSync(validatedConfig, {
        skipMissingProperties: false,
        whitelist: true,
        forbidNonWhitelisted: false,
      });

      for (const error of validationErrors) {
        if (error.constraints) {
          errors.push(...Object.values(error.constraints));
        }
      }
    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }

    return errors;
  }

  private static validateEnvironmentSpecific(config: Record<string, any>, environment: string): string[] {
    const errors: string[] = [];

    switch (environment) {
      case 'production':
        if (!config.database?.ssl) {
          errors.push('Production environment requires SSL for database connections');
        }
        if (config.logging?.level === 'debug') {
          errors.push('Debug logging should not be enabled in production');
        }
        if (!config.database?.password || config.database.password === 'postgres') {
          errors.push('Production environment requires a secure database password');
        }
        if (config.server?.cors?.origins?.includes('*')) {
          errors.push('Production environment should not allow all CORS origins');
        }
        break;

      case 'staging':
        if (!config.database?.password || config.database.password === 'postgres') {
          errors.push('Staging environment requires a secure database password');
        }
        break;

      case 'development':
        // Less strict validation for development
        break;

      default:
        errors.push(`Unknown environment: ${environment}`);
    }

    return errors;
  }

  private static validateSecurity(config: Record<string, any>, environment: string): string[] {
    const warnings: string[] = [];

    // Check for default or weak passwords
    const weakPasswords = ['password', 'admin', '123456', 'postgres', 'redis'];
    if (weakPasswords.includes(config.database?.password)) {
      warnings.push('Database password appears to be weak or default');
    }

    // Check SSL configuration
    if (environment !== 'development' && !config.database?.ssl) {
      warnings.push('SSL is not enabled for database connections');
    }

    // Check rate limiting
    if (!config.server?.rateLimit?.maxRequests) {
      warnings.push('Rate limiting is not configured');
    }

    // Check CORS configuration
    if (config.server?.cors?.enabled && config.server?.cors?.origins?.includes('*')) {
      warnings.push('CORS is configured to allow all origins');
    }

    return warnings;
  }

  private static validateCrossFields(config: Record<string, any>): string[] {
    const errors: string[] = [];

    // Validate port range
    if (config.server?.port) {
      const port = parseInt(config.server.port);
      if (isNaN(port) || port < 1 || port > 65535) {
        errors.push('Server port must be between 1 and 65535');
      }
    }

    // Validate database configuration
    if (config.database) {
      if (!config.database.host) {
        errors.push('Database host is required');
      }
      if (!config.database.database) {
        errors.push('Database name is required');
      }
      if (config.database.maxConnections && config.database.maxConnections < 1) {
        errors.push('Database maxConnections must be at least 1');
      }
    }

    // Validate Redis configuration
    if (config.redis) {
      const redisPort = parseInt(config.redis.port);
      if (isNaN(redisPort) || redisPort < 1 || redisPort > 65535) {
        errors.push('Redis port must be between 1 and 65535');
      }
    }

    // Validate logging configuration
    if (config.logging?.file?.enabled && !config.logging?.file?.path) {
      errors.push('Log file path is required when file logging is enabled');
    }

    return errors;
  }

  static logValidationResults(result: ValidationResult): void {
    if (result.errors.length > 0) {
      this.logger.error('Configuration validation failed:');
      result.errors.forEach((error) => this.logger.error(`  - ${error}`));
    }

    if (result.warnings.length > 0) {
      this.logger.warn('Configuration validation warnings:');
      result.warnings.forEach((warning) => this.logger.warn(`  - ${warning}`));
    }

    if (result.isValid && result.warnings.length === 0) {
      this.logger.log('Configuration validation passed');
    }
  }
}