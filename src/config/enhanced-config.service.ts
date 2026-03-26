import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { ConfigEncryptionService } from './config-encryption.service';
import { ConfigAuditService } from './config-audit.service';
import { ConfigVersioningService } from './config-versioning.service';
import { getValidationSchema } from './enhanced-validation.schema';
import * as Joi from 'joi';

export interface ConfigOptions {
  validateOnLoad?: boolean;
  encryptSensitive?: boolean;
  versionOnLoad?: boolean;
  auditAccess?: boolean;
  encryptionKeyId?: string;
}

@Injectable()
export class EnhancedConfigService implements OnModuleInit {
  private readonly logger = new Logger(EnhancedConfigService.name);
  private readonly sensitiveKeys = [
    'password', 'secret', 'key', 'token', 'credential',
    'jwt', 'smtp_pass', 'aws_secret', 'signer_secret',
    'webhook_secret', 'backup_encryption_key'
  ];

  constructor(
    private readonly nestConfigService: NestConfigService,
    private readonly encryptionService: ConfigEncryptionService,
    private readonly auditService: ConfigAuditService,
    private readonly versioningService: ConfigVersioningService,
  ) {}

  async onModuleInit() {
    await this.initializeConfiguration();
  }

  private async initializeConfiguration(): Promise<void> {
    try {
      this.logger.log('Initializing enhanced configuration management...');
      
      // Validate configuration
      await this.validateConfiguration();
      
      // Create initial version if none exists
      const currentVersion = await this.versioningService.getCurrentVersionData();
      if (!currentVersion) {
        await this.createVersion('Initial configuration load', ['initial']);
      }
      
      this.logger.log('Enhanced configuration management initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize configuration: ${error.message}`);
      throw error;
    }
  }

  private async validateConfiguration(): Promise<void> {
    try {
      const env = process.env.NODE_ENV || 'development';
      const schema = getValidationSchema(env);
      
      // Get all environment variables
      const envVars = { ...process.env };
      
      const { error, value } = schema.validate(envVars, {
        allowUnknown: true,
        stripUnknown: false,
      });

      if (error) {
        const errorMessage = `Configuration validation failed: ${error.details.map(d => d.message).join(', ')}`;
        this.auditService.logConfigError('UPDATE', 'validation', errorMessage);
        throw new Error(errorMessage);
      }

      this.auditService.logConfigChange('UPDATE', 'validation', undefined, 'success');
      this.logger.log('Configuration validation passed');
    } catch (error) {
      this.logger.error(`Configuration validation failed: ${error.message}`);
      throw error;
    }
  }

  get<T = any>(key: string, defaultValue?: T, options?: ConfigOptions): T {
    try {
      const value = this.nestConfigService.get<T>(key, defaultValue);
      
      // Log access if audit is enabled
      if (options?.auditAccess !== false) {
        this.auditService.logConfigChange('READ', key, undefined, String(value));
      }
      
      return value;
    } catch (error) {
      this.auditService.logConfigError('READ', key, error.message);
      this.logger.error(`Failed to get config key ${key}: ${error.message}`);
      return defaultValue as T;
    }
  }

  async set(key: string, value: any, options?: ConfigOptions): Promise<void> {
    try {
      const oldValue = this.nestConfigService.get(key);
      
      // Validate the new value
      await this.validateConfigValue(key, value);
      
      // Encrypt if sensitive and encryption is enabled
      let processedValue = value;
      if (options?.encryptSensitive && this.isSensitiveKey(key)) {
        const encrypted = this.encryptionService.encrypt(String(value), options.encryptionKeyId);
        processedValue = `encrypted:${JSON.stringify(encrypted)}`;
      }
      
      // Update the configuration
      process.env[key] = String(processedValue);
      
      // Create version if enabled
      if (options?.versionOnLoad !== false) {
        await this.createVersion(`Updated ${key}`, ['update', key]);
      }
      
      // Log the change
      this.auditService.logConfigChange(
        'UPDATE',
        key,
        String(oldValue),
        String(value),
        options?.encryptionKeyId
      );
      
      this.logger.log(`Configuration key ${key} updated successfully`);
    } catch (error) {
      this.auditService.logConfigError('UPDATE', key, error.message);
      this.logger.error(`Failed to set config key ${key}: ${error.message}`);
      throw error;
    }
  }

  private async validateConfigValue(key: string, value: any): Promise<void> {
    try {
      const env = process.env.NODE_ENV || 'development';
      const schema = getValidationSchema(env);
      
      // Create a partial schema with just the key being validated
      const keySchema = schema.extract(key);
      if (keySchema) {
        const { error } = keySchema.validate(value);
        if (error) {
          throw new Error(`Validation failed for ${key}: ${error.message}`);
        }
      }
    } catch (error) {
      throw new Error(`Validation error for ${key}: ${error.message}`);
    }
  }

  private isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return this.sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
  }

  async getAll(options?: ConfigOptions): Promise<Record<string, any>> {
    try {
      const config: Record<string, any> = {};
      
      // Get all configuration keys
      const schema = getValidationSchema(process.env.NODE_ENV || 'development');
      const keys = Object.keys(schema.describe().keys || {});
      
      for (const key of keys) {
        let value = this.nestConfigService.get(key);
        
        // Decrypt if it's encrypted
        if (typeof value === 'string' && value.startsWith('encrypted:')) {
          try {
            const encryptedData = JSON.parse(value.substring(10));
            value = this.encryptionService.decrypt(encryptedData, options?.encryptionKeyId);
          } catch (decryptError) {
            this.logger.warn(`Failed to decrypt ${key}: ${decryptError.message}`);
          }
        }
        
        config[key] = value;
      }
      
      // Log access if audit is enabled
      if (options?.auditAccess !== false) {
        this.auditService.logConfigChange('READ', 'all', undefined, `${Object.keys(config).length} keys`);
      }
      
      return config;
    } catch (error) {
      this.auditService.logConfigError('READ', 'all', error.message);
      this.logger.error(`Failed to get all configuration: ${error.message}`);
      return {};
    }
  }

  async createVersion(description?: string, tags?: string[]): Promise<string> {
    try {
      const config = await this.getAll({ auditAccess: false });
      return await this.versioningService.createVersion(config, {
        description,
        tags,
        encrypt: true,
      });
    } catch (error) {
      this.logger.error(`Failed to create version: ${error.message}`);
      throw error;
    }
  }

  async rollbackToVersion(version: string): Promise<void> {
    try {
      const versionData = await this.versioningService.rollbackToVersion(version);
      if (!versionData) {
        throw new Error(`Failed to rollback to version ${version}`);
      }
      
      // Apply the rolled back configuration
      for (const [key, value] of Object.entries(versionData)) {
        process.env[key] = String(value);
      }
      
      this.logger.log(`Successfully rolled back to version ${version}`);
    } catch (error) {
      this.logger.error(`Failed to rollback to version ${version}: ${error.message}`);
      throw error;
    }
  }

  async getAuditLogs(filter?: any): Promise<any[]> {
    return this.auditService.getAuditLogs(filter);
  }

  async getVersions(filter?: any): Promise<any[]> {
    return this.versioningService.listVersions(filter);
  }

  async compareVersions(version1: string, version2: string): Promise<any> {
    return this.versioningService.compareVersions(version1, version2);
  }

  async exportConfiguration(outputPath: string, includeSecrets: boolean = false): Promise<void> {
    try {
      const config = await this.getAll({ auditAccess: false });
      
      if (!includeSecrets) {
        // Mask sensitive values
        for (const [key, value] of Object.entries(config)) {
          if (this.isSensitiveKey(key) && typeof value === 'string') {
            config[key] = value.length > 8 ? 
              value.substring(0, 4) + '***' + value.substring(value.length - 4) : 
              '***';
          }
        }
      }
      
      const exportData = {
        exportedAt: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        config,
      };
      
      const fs = require('fs');
      fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
      
      this.auditService.logConfigChange('CREATE', 'export', undefined, outputPath);
      this.logger.log(`Configuration exported to: ${outputPath}`);
    } catch (error) {
      this.auditService.logConfigError('CREATE', 'export', error.message);
      this.logger.error(`Failed to export configuration: ${error.message}`);
      throw error;
    }
  }

  async importConfiguration(inputPath: string, includeSecrets: boolean = false): Promise<void> {
    try {
      const fs = require('fs');
      const importData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
      
      // Validate imported configuration
      for (const [key, value] of Object.entries(importData.config)) {
        await this.validateConfigValue(key, value);
      }
      
      // Apply imported configuration
      for (const [key, value] of Object.entries(importData.config)) {
        if (!includeSecrets && this.isSensitiveKey(key)) {
          this.logger.warn(`Skipping sensitive key during import: ${key}`);
          continue;
        }
        
        const oldValue = process.env[key];
        process.env[key] = String(value);
        
        this.auditService.logConfigChange('UPDATE', key, oldValue, String(value));
      }
      
      // Create a version after import
      await this.createVersion(`Imported from ${inputPath}`, ['import']);
      
      this.logger.log(`Configuration imported from: ${inputPath}`);
    } catch (error) {
      this.auditService.logConfigError('CREATE', 'import', error.message);
      this.logger.error(`Failed to import configuration: ${error.message}`);
      throw error;
    }
  }

  async rotateEncryptionKey(newKeyId: string): Promise<void> {
    try {
      const currentKeyId = process.env.CONFIG_ENCRYPTION_KEY_ID || 'default';
      
      // Get all sensitive values
      const sensitiveValues: Record<string, string> = {};
      const config = await this.getAll({ auditAccess: false });
      
      for (const [key, value] of Object.entries(config)) {
        if (this.isSensitiveKey(key) && typeof value === 'string') {
          sensitiveValues[key] = value;
        }
      }
      
      // Rotate the key
      this.encryptionService.rotateKey(currentKeyId, newKeyId);
      
      // Re-encrypt all sensitive values with the new key
      for (const [key, value] of Object.entries(sensitiveValues)) {
        const encrypted = this.encryptionService.encrypt(value, newKeyId);
        process.env[key] = `encrypted:${JSON.stringify(encrypted)}`;
      }
      
      // Update the key ID
      process.env.CONFIG_ENCRYPTION_KEY_ID = newKeyId;
      
      // Create a version after key rotation
      await this.createVersion(`Rotated encryption key from ${currentKeyId} to ${newKeyId}`, ['key-rotation']);
      
      this.auditService.logConfigChange('ROTATE_KEY', currentKeyId, currentKeyId, newKeyId);
      this.logger.log(`Encryption key rotated from ${currentKeyId} to ${newKeyId}`);
    } catch (error) {
      this.auditService.logConfigError('ROTATE_KEY', 'encryption', error.message);
      this.logger.error(`Failed to rotate encryption key: ${error.message}`);
      throw error;
    }
  }

  isHealthy(): boolean {
    try {
      // Check if configuration is accessible
      const nodeEnv = this.get('NODE_ENV');
      const port = this.get('PORT');
      
      return !!(nodeEnv && port);
    } catch (error) {
      this.logger.error(`Configuration health check failed: ${error.message}`);
      return false;
    }
  }

  async getConfigurationStatus(): Promise<{
    isHealthy: boolean;
    environment: string;
    currentVersion?: string;
    totalConfigs: number;
    encryptedConfigs: number;
    lastAuditEntry?: any;
  }> {
    try {
      const config = await this.getAll({ auditAccess: false });
      const currentVersion = await this.versioningService.getCurrentVersionData();
      const auditLogs = await this.auditService.getAuditLogs();
      
      const encryptedConfigs = Object.keys(config).filter(key => {
        const value = process.env[key];
        return typeof value === 'string' && value.startsWith('encrypted:');
      }).length;
      
      return {
        isHealthy: this.isHealthy(),
        environment: process.env.NODE_ENV || 'unknown',
        currentVersion: currentVersion?.version,
        totalConfigs: Object.keys(config).length,
        encryptedConfigs,
        lastAuditEntry: auditLogs[0],
      };
    } catch (error) {
      this.logger.error(`Failed to get configuration status: ${error.message}`);
      return {
        isHealthy: false,
        environment: 'unknown',
        totalConfigs: 0,
        encryptedConfigs: 0,
      };
    }
  }
}
