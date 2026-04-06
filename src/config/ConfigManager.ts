import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Configuration, ConfigType, ConfigEnvironment, ConfigStatus, ConfigurationAudit } from '../models/Configuration';
import { ConfigEncryptionService } from './config-encryption.service';
import { ConfigAuditService } from './config-audit.service';
import { ConfigVersioningService } from './config-versioning.service';
import { validate } from 'joi';

export interface ConfigUpdateDto {
  value: string;
  description?: string;
  metadata?: Record<string, any>;
  validationSchema?: string;
  requiresRestart?: boolean;
  reason?: string;
}

export interface ConfigQueryDto {
  environment?: ConfigEnvironment;
  category?: string;
  status?: ConfigStatus;
  isFeatureFlag?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ConfigManager {
  private readonly logger = new Logger(ConfigManager.name);
  private configCache = new Map<string, Configuration>();
  private cacheExpiry = new Map<string, Date>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(Configuration)
    private configRepository: Repository<Configuration>,
    @InjectRepository(ConfigurationAudit)
    private auditRepository: Repository<ConfigurationAudit>,
    private encryptionService: ConfigEncryptionService,
    private auditService: ConfigAuditService,
    private versioningService: ConfigVersioningService,
    private dataSource: DataSource,
  ) {}

  async getConfig(key: string, environment: ConfigEnvironment): Promise<Configuration> {
    const cacheKey = `${key}:${environment}`;
    
    // Check cache first
    if (this.configCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      return this.configCache.get(cacheKey);
    }

    const config = await this.configRepository.findOne({
      where: { key, environment, status: ConfigStatus.ACTIVE },
      relations: ['createdBy', 'updatedBy'],
    });

    if (!config) {
      throw new NotFoundException(`Configuration '${key}' not found for environment '${environment}'`);
    }

    // Decrypt if necessary
    if (config.isEncrypted) {
      config.value = await this.encryptionService.decrypt(config.value);
    }

    // Cache the result
    this.configCache.set(cacheKey, config);
    this.cacheExpiry.set(cacheKey, new Date(Date.now() + this.CACHE_TTL));

    return config;
  }

  async createConfig(
    key: string,
    type: ConfigType,
    value: string,
    environment: ConfigEnvironment,
    options: Partial<Configuration> = {},
    userId: string,
  ): Promise<Configuration> {
    // Check if config already exists
    const existing = await this.configRepository.findOne({
      where: { key, environment },
    });

    if (existing) {
      throw new ConflictException(`Configuration '${key}' already exists for environment '${environment}'`);
    }

    // Validate value against schema if provided
    if (options.validationSchema) {
      await this.validateConfigValue(value, options.validationSchema);
    }

    // Encrypt if necessary
    let finalValue = value;
    if (options.isEncrypted) {
      finalValue = await this.encryptionService.encrypt(value);
    }

    const config = this.configRepository.create({
      key,
      type,
      value: finalValue,
      environment,
      status: ConfigStatus.ACTIVE,
      createdBy: { id: userId } as any,
      updatedBy: { id: userId } as any,
      ...options,
    });

    const savedConfig = await this.configRepository.save(config);

    // Create audit entry
    await this.auditService.createAuditEntry(savedConfig.id, 'CREATE', null, value, userId, 'Configuration created');

    // Invalidate cache
    this.invalidateCache(`${key}:${environment}`);

    this.logger.log(`Created configuration: ${key} for ${environment}`);
    return savedConfig;
  }

  async updateConfig(
    key: string,
    environment: ConfigEnvironment,
    updateDto: ConfigUpdateDto,
    userId: string,
  ): Promise<Configuration> {
    const config = await this.getConfig(key, environment);

    // Validate new value
    if (config.validationSchema) {
      await this.validateConfigValue(updateDto.value, config.validationSchema);
    }

    const oldValue = config.value;

    // Create version before update
    await this.versioningService.createVersion(config);

    // Store rollback value
    config.rollbackValue = {
      value: oldValue,
      updatedAt: new Date(),
      updatedBy: userId,
    };

    // Encrypt if necessary
    if (config.isEncrypted) {
      config.value = await this.encryptionService.encrypt(updateDto.value);
    } else {
      config.value = updateDto.value;
    }

    if (updateDto.description) config.description = updateDto.description;
    if (updateDto.metadata) config.metadata = updateDto.metadata;
    if (updateDto.requiresRestart !== undefined) config.requiresRestart = updateDto.requiresRestart;
    config.updatedBy = { id: userId } as any;

    const savedConfig = await this.configRepository.save(config);

    // Create audit entry
    await this.auditService.createAuditEntry(
      config.id,
      'UPDATE',
      oldValue,
      updateDto.value,
      userId,
      updateDto.reason,
    );

    // Invalidate cache
    this.invalidateCache(`${key}:${environment}`);

    this.logger.log(`Updated configuration: ${key} for ${environment}`);
    return savedConfig;
  }

  async rollbackConfig(key: string, environment: ConfigEnvironment, userId: string): Promise<Configuration> {
    const config = await this.configRepository.findOne({
      where: { key, environment },
      relations: ['createdBy', 'updatedBy'],
    });

    if (!config) {
      throw new NotFoundException(`Configuration '${key}' not found for environment '${environment}'`);
    }

    if (!config.rollbackValue) {
      throw new ConflictException(`No rollback value available for configuration '${key}'`);
    }

    const currentValue = config.value;
    const rollbackValue = config.rollbackValue.value;

    // Create version before rollback
    await this.versioningService.createVersion(config);

    config.value = rollbackValue;
    config.updatedBy = { id: userId } as any;

    const savedConfig = await this.configRepository.save(config);

    // Create audit entry
    await this.auditService.createAuditEntry(
      config.id,
      'ROLLBACK',
      currentValue,
      rollbackValue,
      userId,
      'Configuration rolled back to previous value',
    );

    // Invalidate cache
    this.invalidateCache(`${key}:${environment}`);

    this.logger.log(`Rolled back configuration: ${key} for ${environment}`);
    return savedConfig;
  }

  async deleteConfig(key: string, environment: ConfigEnvironment, userId: string): Promise<void> {
    const config = await this.configRepository.findOne({
      where: { key, environment },
    });

    if (!config) {
      throw new NotFoundException(`Configuration '${key}' not found for environment '${environment}'`);
    }

    // Soft delete by marking as inactive
    config.status = ConfigStatus.INACTIVE;
    config.updatedBy = { id: userId } as any;
    await this.configRepository.save(config);

    // Create audit entry
    await this.auditService.createAuditEntry(config.id, 'DELETE', config.value, null, userId, 'Configuration deleted');

    // Invalidate cache
    this.invalidateCache(`${key}:${environment}`);

    this.logger.log(`Deleted configuration: ${key} for ${environment}`);
  }

  async queryConfigs(queryDto: ConfigQueryDto): Promise<{ configs: Configuration[]; total: number }> {
    const queryBuilder = this.configRepository
      .createQueryBuilder('config')
      .leftJoinAndSelect('config.createdBy', 'createdBy')
      .leftJoinAndSelect('config.updatedBy', 'updatedBy');

    if (queryDto.environment) {
      queryBuilder.andWhere('config.environment = :environment', { environment: queryDto.environment });
    }

    if (queryDto.category) {
      queryBuilder.andWhere('config.category = :category', { category: queryDto.category });
    }

    if (queryDto.status) {
      queryBuilder.andWhere('config.status = :status', { status: queryDto.status });
    }

    if (queryDto.isFeatureFlag !== undefined) {
      queryBuilder.andWhere('config.isFeatureFlag = :isFeatureFlag', { isFeatureFlag: queryDto.isFeatureFlag });
    }

    if (queryDto.search) {
      queryBuilder.andWhere(
        '(config.key ILIKE :search OR config.description ILIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    const total = await queryBuilder.getCount();

    if (queryDto.page && queryDto.limit) {
      queryBuilder.skip((queryDto.page - 1) * queryDto.limit).take(queryDto.limit);
    }

    queryBuilder.orderBy('config.updatedAt', 'DESC');

    const configs = await queryBuilder.getMany();

    // Decrypt encrypted values
    for (const config of configs) {
      if (config.isEncrypted) {
        config.value = await this.encryptionService.decrypt(config.value);
      }
    }

    return { configs, total };
  }

  async validateAllConfigurations(environment: ConfigEnvironment): Promise<{ valid: string[]; invalid: string[] }> {
    const configs = await this.configRepository.find({
      where: { environment, status: ConfigStatus.ACTIVE },
    });

    const valid: string[] = [];
    const invalid: string[] = [];

    for (const config of configs) {
      try {
        if (config.validationSchema) {
          await this.validateConfigValue(config.value, config.validationSchema);
        }
        valid.push(config.key);
      } catch (error) {
        invalid.push(config.key);
      }
    }

    return { valid, invalid };
  }

  async exportConfigurations(environment: ConfigEnvironment): Promise<Record<string, any>> {
    const configs = await this.configRepository.find({
      where: { environment, status: ConfigStatus.ACTIVE },
    });

    const exportData: Record<string, any> = {};

    for (const config of configs) {
      let value = config.value;
      if (config.isEncrypted) {
        value = await this.encryptionService.decrypt(value);
      }

      try {
        // Parse JSON values
        if (config.type === ConfigType.JSON || config.type === ConfigType.ARRAY) {
          value = JSON.parse(value);
        }
      } catch {
        // Keep as string if parsing fails
      }

      exportData[config.key] = {
        value,
        type: config.type,
        description: config.description,
        category: config.category,
        isFeatureFlag: config.isFeatureFlag,
      };
    }

    return exportData;
  }

  async importConfigurations(
    environment: ConfigEnvironment,
    configsData: Record<string, any>,
    userId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      for (const [key, data] of Object.entries(configsData)) {
        const configData = data as any;
        
        let value = configData.value;
        const type = configData.type || ConfigType.STRING;

        // Stringify JSON values
        if (type === ConfigType.JSON || type === ConfigType.ARRAY) {
          value = JSON.stringify(value);
        }

        const existing = await manager.findOne(Configuration, {
          where: { key, environment },
        });

        if (existing) {
          // Update existing
          await this.updateConfig(key, environment, {
            value,
            description: configData.description,
            reason: 'Imported configuration',
          }, userId);
        } else {
          // Create new
          await this.createConfig(
            key,
            type,
            value,
            environment,
            {
              description: configData.description,
              category: configData.category,
              isFeatureFlag: configData.isFeatureFlag,
            },
            userId,
          );
        }
      }
    });

    // Clear all cache for the environment
    this.clearEnvironmentCache(environment);

    this.logger.log(`Imported ${Object.keys(configsData).length} configurations for ${environment}`);
  }

  private async validateConfigValue(value: string, schema: string): Promise<void> {
    try {
      const validationSchema = JSON.parse(schema);
      await validate(JSON.parse(value), validationSchema);
    } catch (error) {
      throw new ConflictException(`Configuration value validation failed: ${error.message}`);
    }
  }

  private isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey);
    return expiry && expiry > new Date();
  }

  private invalidateCache(cacheKey: string): void {
    this.configCache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
  }

  private clearEnvironmentCache(environment: ConfigEnvironment): void {
    for (const key of this.configCache.keys()) {
      if (key.endsWith(`:${environment}`)) {
        this.invalidateCache(key);
      }
    }
  }

  async refreshCache(key?: string, environment?: ConfigEnvironment): Promise<void> {
    if (key && environment) {
      this.invalidateCache(`${key}:${environment}`);
    } else if (environment) {
      this.clearEnvironmentCache(environment);
    } else {
      this.configCache.clear();
      this.cacheExpiry.clear();
    }
  }

  async getCacheStats(): Promise<{ size: number; keys: string[] }> {
    return {
      size: this.configCache.size,
      keys: Array.from(this.configCache.keys()),
    };
  }
}
