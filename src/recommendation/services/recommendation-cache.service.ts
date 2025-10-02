import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Recommendation } from '../entities/recommendation.entity';
import { LearningPath } from '../entities/learning-path.entity';
import { RecommendationContext } from './recommendation-engine.service';

interface CacheKey {
  prefix: string;
  userId: string;
  params?: Record<string, any>;
}

interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize?: number;
}

@Injectable()
export class RecommendationCacheService {
  private readonly logger = new Logger(RecommendationCacheService.name);

  // Cache configurations for different data types
  private readonly cacheConfigs = {
    recommendations: { ttl: 300, maxSize: 1000 }, // 5 minutes
    userProfile: { ttl: 1800, maxSize: 500 }, // 30 minutes
    similarityScores: { ttl: 3600, maxSize: 2000 }, // 1 hour
    learningPaths: { ttl: 600, maxSize: 200 }, // 10 minutes
    analytics: { ttl: 900, maxSize: 100 }, // 15 minutes
    mlFeatures: { ttl: 7200, maxSize: 1000 }, // 2 hours
    collaborativeData: { ttl: 1800, maxSize: 500 }, // 30 minutes
  };

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Cache user recommendations
   */
  async cacheRecommendations(
    userId: string,
    context: RecommendationContext,
    recommendations: Recommendation[],
  ): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey({
        prefix: 'recommendations',
        userId,
        params: {
          type: context.context,
          sessionId: context.sessionId,
          deviceType: context.deviceType,
        },
      });

      await this.cacheManager.set(
        cacheKey,
        recommendations,
        this.cacheConfigs.recommendations.ttl * 1000,
      );

      this.logger.debug(`Cached ${recommendations.length} recommendations for user ${userId}`);
    } catch (error) {
      this.logger.error('Error caching recommendations:', error);
    }
  }

  /**
   * Get cached recommendations
   */
  async getCachedRecommendations(
    userId: string,
    context: RecommendationContext,
  ): Promise<Recommendation[] | null> {
    try {
      const cacheKey = this.buildCacheKey({
        prefix: 'recommendations',
        userId,
        params: {
          type: context.context,
          sessionId: context.sessionId,
          deviceType: context.deviceType,
        },
      });

      const cached = await this.cacheManager.get<Recommendation[]>(cacheKey);

      if (cached) {
        this.logger.debug(`Retrieved ${cached.length} cached recommendations for user ${userId}`);
      }

      return cached || null;
    } catch (error) {
      this.logger.error('Error retrieving cached recommendations:', error);
      return null;
    }
  }

  /**
   * Cache user profile data
   */
  async cacheUserProfile(userId: string, profile: any): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey({
        prefix: 'userProfile',
        userId,
      });

      await this.cacheManager.set(cacheKey, profile, this.cacheConfigs.userProfile.ttl * 1000);

      this.logger.debug(`Cached user profile for user ${userId}`);
    } catch (error) {
      this.logger.error('Error caching user profile:', error);
    }
  }

  /**
   * Get cached user profile
   */
  async getCachedUserProfile(userId: string): Promise<any | null> {
    try {
      const cacheKey = this.buildCacheKey({
        prefix: 'userProfile',
        userId,
      });

      return (await this.cacheManager.get(cacheKey)) || null;
    } catch (error) {
      this.logger.error('Error retrieving cached user profile:', error);
      return null;
    }
  }

  /**
   * Cache similarity scores between courses
   */
  async cacheSimilarityScores(
    courseId1: string,
    courseId2: string,
    similarity: number,
  ): Promise<void> {
    try {
      const cacheKey = this.buildSimilarityCacheKey(courseId1, courseId2);

      await this.cacheManager.set(
        cacheKey,
        similarity,
        this.cacheConfigs.similarityScores.ttl * 1000,
      );
    } catch (error) {
      this.logger.error('Error caching similarity scores:', error);
    }
  }

  /**
   * Get cached similarity scores
   */
  async getCachedSimilarityScores(courseId1: string, courseId2: string): Promise<number | null> {
    try {
      const cacheKey = this.buildSimilarityCacheKey(courseId1, courseId2);
      return (await this.cacheManager.get<number>(cacheKey)) || null;
    } catch (error) {
      this.logger.error('Error retrieving cached similarity scores:', error);
      return null;
    }
  }

  /**
   * Cache learning paths
   */
  async cacheLearningPath(userId: string, learningPath: LearningPath): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey({
        prefix: 'learningPaths',
        userId,
        params: { pathId: learningPath.id },
      });

      await this.cacheManager.set(
        cacheKey,
        learningPath,
        this.cacheConfigs.learningPaths.ttl * 1000,
      );

      this.logger.debug(`Cached learning path ${learningPath.id} for user ${userId}`);
    } catch (error) {
      this.logger.error('Error caching learning path:', error);
    }
  }

  /**
   * Get cached learning path
   */
  async getCachedLearningPath(userId: string, pathId: string): Promise<LearningPath | null> {
    try {
      const cacheKey = this.buildCacheKey({
        prefix: 'learningPaths',
        userId,
        params: { pathId },
      });

      return (await this.cacheManager.get<LearningPath>(cacheKey)) || null;
    } catch (error) {
      this.logger.error('Error retrieving cached learning path:', error);
      return null;
    }
  }

  /**
   * Cache ML features for users
   */
  async cacheMLFeatures(userId: string, features: any): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey({
        prefix: 'mlFeatures',
        userId,
      });

      await this.cacheManager.set(cacheKey, features, this.cacheConfigs.mlFeatures.ttl * 1000);

      this.logger.debug(`Cached ML features for user ${userId}`);
    } catch (error) {
      this.logger.error('Error caching ML features:', error);
    }
  }

  /**
   * Get cached ML features
   */
  async getCachedMLFeatures(userId: string): Promise<any | null> {
    try {
      const cacheKey = this.buildCacheKey({
        prefix: 'mlFeatures',
        userId,
      });

      return (await this.cacheManager.get(cacheKey)) || null;
    } catch (error) {
      this.logger.error('Error retrieving cached ML features:', error);
      return null;
    }
  }

  /**
   * Cache collaborative filtering data
   */
  async cacheCollaborativeData(
    userId: string,
    dataType: 'similarUsers' | 'userInteractions',
    data: any,
  ): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey({
        prefix: 'collaborativeData',
        userId,
        params: { dataType },
      });

      await this.cacheManager.set(cacheKey, data, this.cacheConfigs.collaborativeData.ttl * 1000);

      this.logger.debug(`Cached collaborative ${dataType} for user ${userId}`);
    } catch (error) {
      this.logger.error('Error caching collaborative data:', error);
    }
  }

  /**
   * Get cached collaborative data
   */
  async getCachedCollaborativeData(
    userId: string,
    dataType: 'similarUsers' | 'userInteractions',
  ): Promise<any | null> {
    try {
      const cacheKey = this.buildCacheKey({
        prefix: 'collaborativeData',
        userId,
        params: { dataType },
      });

      return (await this.cacheManager.get(cacheKey)) || null;
    } catch (error) {
      this.logger.error('Error retrieving cached collaborative data:', error);
      return null;
    }
  }

  /**
   * Cache analytics data
   */
  async cacheAnalytics(
    userId: string,
    analyticsType: string,
    data: any,
    customTTL?: number,
  ): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey({
        prefix: 'analytics',
        userId,
        params: { analyticsType },
      });

      const ttl = customTTL || this.cacheConfigs.analytics.ttl;

      await this.cacheManager.set(cacheKey, data, ttl * 1000);

      this.logger.debug(`Cached analytics ${analyticsType} for user ${userId}`);
    } catch (error) {
      this.logger.error('Error caching analytics:', error);
    }
  }

  /**
   * Get cached analytics data
   */
  async getCachedAnalytics(userId: string, analyticsType: string): Promise<any | null> {
    try {
      const cacheKey = this.buildCacheKey({
        prefix: 'analytics',
        userId,
        params: { analyticsType },
      });

      return (await this.cacheManager.get(cacheKey)) || null;
    } catch (error) {
      this.logger.error('Error retrieving cached analytics:', error);
      return null;
    }
  }

  /**
   * Invalidate user-specific cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      const patterns = [
        `recommendations:${userId}:*`,
        `userProfile:${userId}`,
        `learningPaths:${userId}:*`,
        `mlFeatures:${userId}`,
        `collaborativeData:${userId}:*`,
        `analytics:${userId}:*`,
      ];

      for (const pattern of patterns) {
        await this.invalidateByPattern(pattern);
      }

      this.logger.log(`Invalidated cache for user ${userId}`);
    } catch (error) {
      this.logger.error('Error invalidating user cache:', error);
    }
  }

  /**
   * Invalidate recommendation cache for user
   */
  async invalidateRecommendationCache(userId: string): Promise<void> {
    try {
      await this.invalidateByPattern(`recommendations:${userId}:*`);
      this.logger.debug(`Invalidated recommendation cache for user ${userId}`);
    } catch (error) {
      this.logger.error('Error invalidating recommendation cache:', error);
    }
  }

  /**
   * Invalidate learning path cache for user
   */
  async invalidateLearningPathCache(userId: string, pathId?: string): Promise<void> {
    try {
      const pattern = pathId ? `learningPaths:${userId}:${pathId}` : `learningPaths:${userId}:*`;

      await this.invalidateByPattern(pattern);
      this.logger.debug(`Invalidated learning path cache for user ${userId}`);
    } catch (error) {
      this.logger.error('Error invalidating learning path cache:', error);
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache(userId: string): Promise<void> {
    try {
      this.logger.log(`Warming up cache for user ${userId}`);

      // This would typically pre-load frequently accessed data
      // Implementation depends on your specific use case

      // Example: Pre-load user profile, recent recommendations, etc.
      // await this.preloadUserProfile(userId);
      // await this.preloadRecentRecommendations(userId);
    } catch (error) {
      this.logger.error('Error warming up cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    size: number;
    hitRate: number;
    missRate: number;
  }> {
    try {
      // This would depend on your cache implementation
      // Redis cache manager might provide different stats
      return {
        size: 0, // Number of items in cache
        hitRate: 0, // Cache hit rate percentage
        missRate: 0, // Cache miss rate percentage
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return { size: 0, hitRate: 0, missRate: 0 };
    }
  }

  /**
   * Clear all cache
   */
  async clearAllCache(): Promise<void> {
    try {
      await this.cacheManager.reset();
      this.logger.log('Cleared all cache');
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
    }
  }

  /**
   * Build cache key from components
   */
  private buildCacheKey(key: CacheKey): string {
    let cacheKey = `${key.prefix}:${key.userId}`;

    if (key.params) {
      const paramString = Object.entries(key.params)
        .sort(([a], [b]) => a.localeCompare(b)) // Sort for consistent keys
        .map(([k, v]) => `${k}:${v}`)
        .join(':');

      if (paramString) {
        cacheKey += `:${paramString}`;
      }
    }

    return cacheKey;
  }

  /**
   * Build similarity cache key (order-independent)
   */
  private buildSimilarityCacheKey(courseId1: string, courseId2: string): string {
    const [first, second] = [courseId1, courseId2].sort();
    return `similarity:${first}:${second}`;
  }

  /**
   * Invalidate cache by pattern
   */
  private async invalidateByPattern(pattern: string): Promise<void> {
    try {
      // Note: This implementation depends on your cache manager
      // For Redis, you might use SCAN with pattern matching
      // For in-memory cache, you might need to track keys manually

      // Simple implementation for demonstration
      // In production, you'd want more sophisticated pattern matching
      await this.cacheManager.del(pattern);
    } catch (error) {
      this.logger.error(`Error invalidating cache pattern ${pattern}:`, error);
    }
  }

  /**
   * Check if cache key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const value = await this.cacheManager.get(key);
      return value !== undefined && value !== null;
    } catch (error) {
      this.logger.error(`Error checking cache key existence ${key}:`, error);
      return false;
    }
  }

  /**
   * Set cache with custom TTL
   */
  async setWithTTL(key: string, value: any, ttlSeconds: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttlSeconds * 1000);
    } catch (error) {
      this.logger.error(`Error setting cache with TTL ${key}:`, error);
    }
  }

  /**
   * Get cache TTL for a key
   */
  async getTTL(key: string): Promise<number> {
    try {
      // This would depend on your cache implementation
      // Redis provides TTL command, in-memory cache might not
      return 0; // Placeholder
    } catch (error) {
      this.logger.error(`Error getting TTL for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Extend cache TTL for a key
   */
  async extendTTL(key: string, additionalSeconds: number): Promise<void> {
    try {
      const value = await this.cacheManager.get(key);
      if (value !== undefined && value !== null) {
        const currentTTL = await this.getTTL(key);
        const newTTL = currentTTL + additionalSeconds;
        await this.cacheManager.set(key, value, newTTL * 1000);
      }
    } catch (error) {
      this.logger.error(`Error extending TTL for key ${key}:`, error);
    }
  }
}
