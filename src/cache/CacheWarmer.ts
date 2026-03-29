import { Injectable, Logger } from '@nestjs/common';
import { CacheManager } from './CacheManager';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface WarmupStrategy {
  pattern: string;
  priority: 'high' | 'medium' | 'low';
  factory: (key: string) => Promise<any>;
  ttl?: number;
  tags?: string[];
  batchSize?: number;
  delay?: number;
}

export interface WarmupStats {
  totalKeys: number;
  warmedKeys: number;
  failedKeys: number;
  skippedKeys: number;
  duration: number;
  errors: Array<{ key: string; error: string }>;
}

@Injectable()
export class CacheWarmer {
  private readonly logger = new Logger(CacheWarmer.name);
  private readonly strategies = new Map<string, WarmupStrategy>();
  private isWarming = false;
  private warmupHistory: WarmupStats[] = [];

  constructor(
    private readonly cacheManager: CacheManager,
    private readonly configService: ConfigService,
  ) {}

  registerStrategy(name: string, strategy: WarmupStrategy): void {
    this.strategies.set(name, strategy);
    this.logger.log(`Registered warmup strategy: ${name}`);
  }

  async warmCache(strategyNames: string[]): Promise<WarmupStats> {
    if (this.isWarming) {
      throw new Error('Cache warming is already in progress');
    }

    this.isWarming = true;
    const startTime = Date.now();
    const stats: WarmupStats = {
      totalKeys: 0,
      warmedKeys: 0,
      failedKeys: 0,
      skippedKeys: 0,
      duration: 0,
      errors: [],
    };

    try {
      this.logger.log('Starting cache warming...');

      for (const strategyName of strategyNames) {
        const strategy = this.strategies.get(strategyName);
        if (!strategy) {
          this.logger.warn(`Warmup strategy not found: ${strategyName}`);
          continue;
        }

        const strategyStats = await this.executeWarmupStrategy(strategy);
        stats.totalKeys += strategyStats.totalKeys;
        stats.warmedKeys += strategyStats.warmedKeys;
        stats.failedKeys += strategyStats.failedKeys;
        stats.skippedKeys += strategyStats.skippedKeys;
        stats.errors.push(...strategyStats.errors);
      }

      stats.duration = Date.now() - startTime;
      
      this.logger.log(`Cache warming completed: ${stats.warmedKeys}/${stats.totalKeys} keys warmed in ${stats.duration}ms`);
      
      // Store in history
      this.warmupHistory.push(stats);
      if (this.warmupHistory.length > 100) {
        this.warmupHistory.shift();
      }

      return stats;
    } finally {
      this.isWarming = false;
    }
  }

  private async executeWarmupStrategy(strategy: WarmupStrategy): Promise<WarmupStats> {
    const stats: WarmupStats = {
      totalKeys: 0,
      warmedKeys: 0,
      failedKeys: 0,
      skippedKeys: 0,
      duration: 0,
      errors: [],
    };

    try {
      // Get keys matching the pattern
      const keys = await this.getKeysByPattern(strategy.pattern);
      stats.totalKeys = keys.length;

      this.logger.debug(`Processing ${keys.length} keys for pattern: ${strategy.pattern}`);

      const batchSize = strategy.batchSize || 10;
      const delay = strategy.delay || 100;

      // Process in batches to avoid overwhelming the system
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (key) => {
            try {
              // Check if key is already cached
              const existing = await this.cacheManager.get(key);
              if (existing !== null) {
                stats.skippedKeys++;
                return;
              }

              // Warm up the cache
              const value = await strategy.factory(key);
              await this.cacheManager.set(key, value, {
                ttl: strategy.ttl,
                tags: strategy.tags,
                priority: strategy.priority,
              });

              stats.warmedKeys++;
            } catch (error) {
              stats.failedKeys++;
              stats.errors.push({
                key,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              this.logger.error(`Failed to warm key ${key}:`, error);
            }
          }),
        );

        // Add delay between batches
        if (i + batchSize < keys.length && delay > 0) {
          await this.sleep(delay);
        }
      }

      this.logger.debug(`Strategy completed: ${stats.warmedKeys}/${stats.totalKeys} keys warmed`);
    } catch (error) {
      this.logger.error(`Strategy execution failed for pattern ${strategy.pattern}:`, error);
      throw error;
    }

    return stats;
  }

  private async getKeysByPattern(pattern: string): Promise<string[]> {
    // This would typically query your data source to get keys
    // For now, we'll implement a basic pattern matching
    const keys: string[] = [];
    
    // Example patterns - you should customize this based on your application
    if (pattern.includes('user:*')) {
      // Get all user IDs from database
      const userIds = await this.getUserIds();
      keys.push(...userIds.map(id => `user:${id}`));
    } else if (pattern.includes('course:*')) {
      // Get all course IDs from database
      const courseIds = await this.getCourseIds();
      keys.push(...courseIds.map(id => `course:${id}`));
    } else if (pattern.includes('assignment:*')) {
      // Get all assignment IDs from database
      const assignmentIds = await this.getAssignmentIds();
      keys.push(...assignmentIds.map(id => `assignment:${id}`));
    } else {
      // For other patterns, you might need to implement custom logic
      this.logger.warn(`Unknown pattern for cache warming: ${pattern}`);
    }

    return keys;
  }

  private async getUserIds(): Promise<string[]> {
    // This should query your database for user IDs
    // For now, return empty array as placeholder
    return [];
  }

  private async getCourseIds(): Promise<string[]> {
    // This should query your database for course IDs
    // For now, return empty array as placeholder
    return [];
  }

  private async getAssignmentIds(): Promise<string[]> {
    // This should query your database for assignment IDs
    // For now, return empty array as placeholder
    return [];
  }

  async warmPopularKeys(): Promise<WarmupStats> {
    const strategy: WarmupStrategy = {
      pattern: 'popular:*',
      priority: 'high',
      factory: async (key) => {
        // Get popular data based on access patterns
        const type = key.split(':')[1];
        switch (type) {
          case 'courses':
            return this.getPopularCourses();
          case 'users':
            return this.getPopularUsers();
          case 'content':
            return this.getPopularContent();
          default:
            throw new Error(`Unknown popular type: ${type}`);
        }
      },
      ttl: 3600, // 1 hour
      tags: ['popular'],
      batchSize: 5,
      delay: 200,
    };

    return this.executeWarmupStrategy(strategy);
  }

  async warmUserSpecificData(userId: string): Promise<WarmupStats> {
    const strategies = [
      {
        pattern: `user:${userId}:*`,
        priority: 'high' as const,
        factory: async (key) => {
          const type = key.split(':')[2];
          switch (type) {
            case 'profile':
              return this.getUserProfile(userId);
            case 'courses':
              return this.getUserCourses(userId);
            case 'assignments':
              return this.getUserAssignments(userId);
            case 'progress':
              return this.getUserProgress(userId);
            default:
              throw new Error(`Unknown user data type: ${type}`);
          }
        },
        ttl: 1800, // 30 minutes
        tags: ['user', `user:${userId}`],
        batchSize: 3,
        delay: 50,
      },
    ];

    const stats: WarmupStats = {
      totalKeys: 0,
      warmedKeys: 0,
      failedKeys: 0,
      skippedKeys: 0,
      duration: 0,
      errors: [],
    };

    for (const strategy of strategies) {
      const strategyStats = await this.executeWarmupStrategy(strategy);
      stats.totalKeys += strategyStats.totalKeys;
      stats.warmedKeys += strategyStats.warmedKeys;
      stats.failedKeys += strategyStats.failedKeys;
      stats.skippedKeys += strategyStats.skippedKeys;
      stats.errors.push(...strategyStats.errors);
    }

    return stats;
  }

  // Placeholder methods for data fetching
  private async getPopularCourses(): Promise<any> {
    // Implement fetching popular courses
    return [];
  }

  private async getPopularUsers(): Promise<any> {
    // Implement fetching popular users
    return [];
  }

  private async getPopularContent(): Promise<any> {
    // Implement fetching popular content
    return [];
  }

  private async getUserProfile(userId: string): Promise<any> {
    // Implement fetching user profile
    return {};
  }

  private async getUserCourses(userId: string): Promise<any> {
    // Implement fetching user courses
    return [];
  }

  private async getUserAssignments(userId: string): Promise<any> {
    // Implement fetching user assignments
    return [];
  }

  private async getUserProgress(userId: string): Promise<any> {
    // Implement fetching user progress
    return {};
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Scheduled cache warming
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledWarmup(): Promise<void> {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      try {
        this.logger.log('Starting scheduled cache warming...');
        await this.warmPopularKeys();
        this.logger.log('Scheduled cache warming completed');
      } catch (error) {
        this.logger.error('Scheduled cache warming failed:', error);
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async deepWarmup(): Promise<void> {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      try {
        this.logger.log('Starting deep cache warming...');
        const strategyNames = Array.from(this.strategies.keys());
        await this.warmCache(strategyNames);
        this.logger.log('Deep cache warming completed');
      } catch (error) {
        this.logger.error('Deep cache warming failed:', error);
      }
    }
  }

  getWarmupHistory(): WarmupStats[] {
    return [...this.warmupHistory];
  }

  isCurrentlyWarming(): boolean {
    return this.isWarming;
  }

  getRegisteredStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }
}
