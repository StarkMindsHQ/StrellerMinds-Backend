import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FeatureFlag, ConfigEnvironment } from '../models/Configuration';
import { User } from '../user/user.entity';

export interface CreateFeatureFlagDto {
  name: string;
  enabled: boolean;
  environment: ConfigEnvironment;
  description?: string;
  conditions?: {
    userRoles?: string[];
    userSegments?: string[];
    percentage?: number;
    customRules?: Record<string, any>;
  };
  rolloutStrategy?: {
    type: 'immediate' | 'gradual' | 'scheduled';
    percentage?: number;
    startDate?: Date;
    endDate?: Date;
  };
  isGlobal?: boolean;
}

export interface UpdateFeatureFlagDto {
  enabled?: boolean;
  description?: string;
  conditions?: {
    userRoles?: string[];
    userSegments?: string[];
    percentage?: number;
    customRules?: Record<string, any>;
  };
  rolloutStrategy?: {
    type: 'immediate' | 'gradual' | 'scheduled';
    percentage?: number;
    startDate?: Date;
    endDate?: Date;
  };
  isGlobal?: boolean;
}

export interface FeatureFlagEvaluationContext {
  userId?: string;
  userRoles?: string[];
  userSegments?: string[];
  userAgent?: string;
  ipAddress?: string;
  customAttributes?: Record<string, any>;
}

@Injectable()
export class FeatureFlags {
  private readonly logger = new Logger(FeatureFlags.name);
  private flagCache = new Map<string, FeatureFlag>();
  private cacheExpiry = new Map<string, Date>();
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  constructor(
    @InjectRepository(FeatureFlag)
    private featureFlagRepository: Repository<FeatureFlag>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async isFeatureEnabled(
    flagName: string,
    environment: ConfigEnvironment,
    context?: FeatureFlagEvaluationContext,
  ): Promise<boolean> {
    const cacheKey = `${flagName}:${environment}`;
    
    // Check cache first
    let flag = this.flagCache.get(cacheKey);
    if (!flag || !this.isCacheValid(cacheKey)) {
      flag = await this.getFeatureFlag(flagName, environment);
      this.flagCache.set(cacheKey, flag);
      this.cacheExpiry.set(cacheKey, new Date(Date.now() + this.CACHE_TTL));
    }

    // If flag is globally disabled, return false immediately
    if (!flag.enabled) {
      return false;
    }

    // If flag is global and enabled, return true
    if (flag.isGlobal) {
      return true;
    }

    // Evaluate conditions
    return this.evaluateConditions(flag, context);
  }

  async createFeatureFlag(createDto: CreateFeatureFlagDto, userId: string): Promise<FeatureFlag> {
    // Check if flag already exists
    const existing = await this.featureFlagRepository.findOne({
      where: { name: createDto.name, environment: createDto.environment },
    });

    if (existing) {
      throw new ConflictException(`Feature flag '${createDto.name}' already exists for environment '${createDto.environment}'`);
    }

    const flag = this.featureFlagRepository.create({
      ...createDto,
      createdBy: { id: userId } as any,
      updatedBy: { id: userId } as any,
      metrics: {
        impressions: 0,
        conversions: 0,
        errors: 0,
      },
    });

    const savedFlag = await this.featureFlagRepository.save(flag);

    // Invalidate cache
    this.invalidateCache(`${createDto.name}:${createDto.environment}`);

    this.logger.log(`Created feature flag: ${createDto.name} for ${createDto.environment}`);
    return savedFlag;
  }

  async updateFeatureFlag(
    flagName: string,
    environment: ConfigEnvironment,
    updateDto: UpdateFeatureFlagDto,
    userId: string,
  ): Promise<FeatureFlag> {
    const flag = await this.getFeatureFlag(flagName, environment);

    Object.assign(flag, updateDto);
    flag.updatedBy = { id: userId } as any;

    const savedFlag = await this.featureFlagRepository.save(flag);

    // Invalidate cache
    this.invalidateCache(`${flagName}:${environment}`);

    this.logger.log(`Updated feature flag: ${flagName} for ${environment}`);
    return savedFlag;
  }

  async deleteFeatureFlag(flagName: string, environment: ConfigEnvironment): Promise<void> {
    const flag = await this.featureFlagRepository.findOne({
      where: { name: flagName, environment },
    });

    if (!flag) {
      throw new NotFoundException(`Feature flag '${flagName}' not found for environment '${environment}'`);
    }

    await this.featureFlagRepository.remove(flag);

    // Invalidate cache
    this.invalidateCache(`${flagName}:${environment}`);

    this.logger.log(`Deleted feature flag: ${flagName} for ${environment}`);
  }

  async getFeatureFlag(flagName: string, environment: ConfigEnvironment): Promise<FeatureFlag> {
    const flag = await this.featureFlagRepository.findOne({
      where: { name: flagName, environment },
      relations: ['createdBy', 'updatedBy'],
    });

    if (!flag) {
      throw new NotFoundException(`Feature flag '${flagName}' not found for environment '${environment}'`);
    }

    return flag;
  }

  async listFeatureFlags(
    environment?: ConfigEnvironment,
    page = 1,
    limit = 50,
  ): Promise<{ flags: FeatureFlag[]; total: number }> {
    const queryBuilder = this.featureFlagRepository
      .createQueryBuilder('flag')
      .leftJoinAndSelect('flag.createdBy', 'createdBy')
      .leftJoinAndSelect('flag.updatedBy', 'updatedBy');

    if (environment) {
      queryBuilder.andWhere('flag.environment = :environment', { environment });
    }

    const total = await queryBuilder.getCount();
    queryBuilder.skip((page - 1) * limit).take(limit);
    queryBuilder.orderBy('flag.updatedAt', 'DESC');

    const flags = await queryBuilder.getMany();
    return { flags, total };
  }

  async rolloutFeatureFlag(
    flagName: string,
    environment: ConfigEnvironment,
    percentage: number,
    userId: string,
  ): Promise<FeatureFlag> {
    const flag = await this.getFeatureFlag(flagName, environment);

    if (flag.rolloutStrategy?.type !== 'gradual') {
      throw new ConflictException(`Feature flag '${flagName}' is not configured for gradual rollout`);
    }

    flag.rolloutStrategy.percentage = percentage;
    flag.updatedBy = { id: userId } as any;

    const savedFlag = await this.featureFlagRepository.save(flag);

    // Invalidate cache
    this.invalidateCache(`${flagName}:${environment}`);

    this.logger.log(`Rolled out feature flag: ${flagName} to ${percentage}% for ${environment}`);
    return savedFlag;
  }

  async getFeatureFlagMetrics(flagName: string, environment: ConfigEnvironment): Promise<any> {
    const flag = await this.getFeatureFlag(flagName, environment);
    return flag.metrics;
  }

  async recordFeatureFlagMetrics(
    flagName: string,
    environment: ConfigEnvironment,
    metrics: {
      impressions?: number;
      conversions?: number;
      errors?: number;
    },
  ): Promise<void> {
    const flag = await this.getFeatureFlag(flagName, environment);

    flag.metrics.impressions += metrics.impressions || 0;
    flag.metrics.conversions += metrics.conversions || 0;
    flag.metrics.errors += metrics.errors || 0;

    await this.featureFlagRepository.save(flag);
  }

  async evaluateMultipleFlags(
    flagNames: string[],
    environment: ConfigEnvironment,
    context?: FeatureFlagEvaluationContext,
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    // Batch load flags to reduce database queries
    const flags = await this.featureFlagRepository.find({
      where: { name: flagNames, environment, enabled: true },
    });

    // Cache loaded flags
    for (const flag of flags) {
      const cacheKey = `${flag.name}:${environment}`;
      this.flagCache.set(cacheKey, flag);
      this.cacheExpiry.set(cacheKey, new Date(Date.now() + this.CACHE_TTL));
    }

    // Evaluate each flag
    for (const flagName of flagNames) {
      results[flagName] = await this.isFeatureEnabled(flagName, environment, context);
    }

    return results;
  }

  async getActiveFeatureFlags(environment: ConfigEnvironment): Promise<FeatureFlag[]> {
    return this.featureFlagRepository.find({
      where: { environment, enabled: true },
      order: { name: 'ASC' },
    });
  }

  async bulkUpdateFeatureFlags(
    updates: Array<{
      flagName: string;
      environment: ConfigEnvironment;
      updateDto: UpdateFeatureFlagDto;
    }>,
    userId: string,
  ): Promise<FeatureFlag[]> {
    const results: FeatureFlag[] = [];

    await this.dataSource.transaction(async (manager) => {
      for (const update of updates) {
        const flag = await manager.findOne(FeatureFlag, {
          where: { name: update.flagName, environment: update.environment },
        });

        if (!flag) {
          throw new NotFoundException(`Feature flag '${update.flagName}' not found for environment '${update.environment}'`);
        }

        Object.assign(flag, update.updateDto);
        flag.updatedBy = { id: userId } as any;

        const savedFlag = await manager.save(flag);
        results.push(savedFlag);

        // Invalidate cache
        this.invalidateCache(`${update.flagName}:${update.environment}`);
      }
    });

    this.logger.log(`Bulk updated ${updates.length} feature flags`);
    return results;
  }

  private evaluateConditions(flag: FeatureFlag, context?: FeatureFlagEvaluationContext): boolean {
    if (!context || !flag.conditions) {
      return flag.enabled;
    }

    // Check user roles
    if (flag.conditions.userRoles && context.userRoles) {
      const hasRequiredRole = flag.conditions.userRoles.some(role => 
        context.userRoles?.includes(role)
      );
      if (!hasRequiredRole) return false;
    }

    // Check user segments
    if (flag.conditions.userSegments && context.userSegments) {
      const inRequiredSegment = flag.conditions.userSegments.some(segment => 
        context.userSegments?.includes(segment)
      );
      if (!inRequiredSegment) return false;
    }

    // Check percentage rollout
    if (flag.conditions.percentage && context.userId) {
      const hash = this.hashUserId(context.userId);
      const userPercentage = (hash % 100) + 1;
      if (userPercentage > flag.conditions.percentage) return false;
    }

    // Check custom rules
    if (flag.conditions.customRules && context.customAttributes) {
      for (const [key, rule] of Object.entries(flag.conditions.customRules)) {
        const userValue = context.customAttributes[key];
        if (!this.evaluateCustomRule(userValue, rule)) {
          return false;
        }
      }
    }

    // Check rollout strategy
    if (flag.rolloutStrategy) {
      return this.evaluateRolloutStrategy(flag.rolloutStrategy, context);
    }

    return flag.enabled;
  }

  private evaluateRolloutStrategy(strategy: any, context?: FeatureFlagEvaluationContext): boolean {
    const now = new Date();

    switch (strategy.type) {
      case 'immediate':
        return true;

      case 'gradual':
        if (strategy.percentage && context?.userId) {
          const hash = this.hashUserId(context.userId);
          const userPercentage = (hash % 100) + 1;
          return userPercentage <= strategy.percentage;
        }
        return false;

      case 'scheduled':
        if (strategy.startDate && now < strategy.startDate) return false;
        if (strategy.endDate && now > strategy.endDate) return false;
        return true;

      default:
        return true;
    }
  }

  private evaluateCustomRule(userValue: any, rule: any): boolean {
    if (typeof rule === 'string') {
      return userValue === rule;
    }

    if (typeof rule === 'object' && rule !== null) {
      if (rule.operator && rule.value) {
        switch (rule.operator) {
          case 'equals':
            return userValue === rule.value;
          case 'not_equals':
            return userValue !== rule.value;
          case 'greater_than':
            return Number(userValue) > Number(rule.value);
          case 'less_than':
            return Number(userValue) < Number(rule.value);
          case 'contains':
            return String(userValue).includes(String(rule.value));
          case 'in':
            return Array.isArray(rule.value) && rule.value.includes(userValue);
          default:
            return true;
        }
      }
    }

    return true;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey);
    return expiry && expiry > new Date();
  }

  private invalidateCache(cacheKey: string): void {
    this.flagCache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
  }

  async refreshCache(flagName?: string, environment?: ConfigEnvironment): Promise<void> {
    if (flagName && environment) {
      this.invalidateCache(`${flagName}:${environment}`);
    } else if (environment) {
      for (const key of this.flagCache.keys()) {
        if (key.endsWith(`:${environment}`)) {
          this.invalidateCache(key);
        }
      }
    } else {
      this.flagCache.clear();
      this.cacheExpiry.clear();
    }
  }

  async getCacheStats(): Promise<{ size: number; keys: string[] }> {
    return {
      size: this.flagCache.size,
      keys: Array.from(this.flagCache.keys()),
    };
  }
}
