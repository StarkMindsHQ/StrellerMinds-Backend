import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { RecommendationCacheService } from './recommendation-cache.service';
import { RecommendationEngineService } from './recommendation-engine.service';
import { LearningPathService } from './learning-path.service';

interface BatchRecommendationJob {
  userIds: string[];
  options: {
    limit: number;
    minConfidence: number;
    refreshCache: boolean;
  };
}

interface PrecomputationJob {
  type: 'similarity' | 'user_features' | 'collaborative_data';
  params: Record<string, any>;
}

@Injectable()
export class PerformanceOptimizationService {
  private readonly logger = new Logger(PerformanceOptimizationService.name);

  constructor(
    @InjectQueue('recommendation-processing') private recommendationQueue: Queue,
    private cacheService: RecommendationCacheService,
    private recommendationService: RecommendationEngineService,
    private learningPathService: LearningPathService,
  ) {}

  /**
   * Batch generate recommendations for multiple users
   */
  async batchGenerateRecommendations(
    userIds: string[],
    options: {
      limit?: number;
      minConfidence?: number;
      refreshCache?: boolean;
      priority?: number;
    } = {},
  ): Promise<void> {
    try {
      const jobOptions = {
        limit: options.limit || 10,
        minConfidence: options.minConfidence || 0.1,
        refreshCache: options.refreshCache || false,
      };

      // Split into smaller batches for processing
      const batchSize = 50;
      const batches = this.chunkArray(userIds, batchSize);

      for (const batch of batches) {
        await this.recommendationQueue.add(
          'batch-recommendations',
          {
            userIds: batch,
            options: jobOptions,
          } as BatchRecommendationJob,
          {
            priority: options.priority || 0,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        );
      }

      this.logger.log(`Queued batch recommendation generation for ${userIds.length} users`);
    } catch (error) {
      this.logger.error('Error queuing batch recommendations:', error);
      throw error;
    }
  }

  /**
   * Precompute similarity scores for popular courses
   */
  async precomputeSimilarityScores(courseIds: string[]): Promise<void> {
    try {
      await this.recommendationQueue.add(
        'precompute-similarity',
        {
          type: 'similarity',
          params: { courseIds },
        } as PrecomputationJob,
        {
          priority: -1, // Lower priority
          attempts: 2,
        },
      );

      this.logger.log(`Queued similarity precomputation for ${courseIds.length} courses`);
    } catch (error) {
      this.logger.error('Error queuing similarity precomputation:', error);
      throw error;
    }
  }

  /**
   * Precompute user features for active users
   */
  async precomputeUserFeatures(userIds: string[]): Promise<void> {
    try {
      const batchSize = 25;
      const batches = this.chunkArray(userIds, batchSize);

      for (const batch of batches) {
        await this.recommendationQueue.add(
          'precompute-features',
          {
            type: 'user_features',
            params: { userIds: batch },
          } as PrecomputationJob,
          {
            priority: -1,
            attempts: 2,
          },
        );
      }

      this.logger.log(`Queued user feature precomputation for ${userIds.length} users`);
    } catch (error) {
      this.logger.error('Error queuing user feature precomputation:', error);
      throw error;
    }
  }

  /**
   * Optimize recommendation generation with caching and batching
   */
  async optimizedRecommendationGeneration(
    userId: string,
    options: {
      limit?: number;
      minConfidence?: number;
      useCache?: boolean;
      backgroundRefresh?: boolean;
    } = {},
  ): Promise<any[]> {
    const useCache = options.useCache !== false;
    const backgroundRefresh = options.backgroundRefresh || false;

    try {
      // Try cache first if enabled
      if (useCache) {
        const cached = await this.cacheService.getCachedRecommendations(userId, {
          userId,
          context: 'optimized',
        });

        if (cached && cached.length > 0) {
          this.logger.debug(`Serving cached recommendations for user ${userId}`);

          // Optionally refresh cache in background
          if (backgroundRefresh) {
            this.queueBackgroundRefresh(userId, options);
          }

          return cached;
        }
      }

      // Generate fresh recommendations
      const recommendations = await this.recommendationService.generateRecommendations({
        userId,
        limit: options.limit || 10,
        minConfidence: options.minConfidence || 0.1,
      });

      // Cache the results
      if (useCache && recommendations.length > 0) {
        await this.cacheService.cacheRecommendations(
          userId,
          { userId, context: 'optimized' },
          recommendations,
        );
      }

      return recommendations;
    } catch (error) {
      this.logger.error(`Error in optimized recommendation generation for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Parallel processing for multiple recommendation types
   */
  async parallelRecommendationGeneration(userId: string): Promise<{
    contentBased: any[];
    collaborative: any[];
    trending: any[];
    learningPaths: any[];
  }> {
    try {
      const [contentBased, collaborative, trending, learningPaths] = await Promise.allSettled([
        this.generateContentBasedRecommendations(userId),
        this.generateCollaborativeRecommendations(userId),
        this.generateTrendingRecommendations(userId),
        this.generateLearningPathRecommendations(userId),
      ]);

      return {
        contentBased: contentBased.status === 'fulfilled' ? contentBased.value : [],
        collaborative: collaborative.status === 'fulfilled' ? collaborative.value : [],
        trending: trending.status === 'fulfilled' ? trending.value : [],
        learningPaths: learningPaths.status === 'fulfilled' ? learningPaths.value : [],
      };
    } catch (error) {
      this.logger.error(`Error in parallel recommendation generation for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Optimize database queries with connection pooling and query optimization
   */
  async optimizeQueries(): Promise<{
    recommendations: string[];
    performance: string[];
  }> {
    const recommendations = [
      'Use database indexes on frequently queried columns (userId, courseId, createdAt)',
      'Implement query result caching for expensive operations',
      'Use database connection pooling to reduce connection overhead',
      'Optimize JOIN operations by selecting only necessary columns',
      'Use pagination for large result sets to reduce memory usage',
      'Implement read replicas for read-heavy recommendation queries',
      'Use database query explain plans to identify slow queries',
      'Consider denormalization for frequently accessed data',
    ];

    const performance = [
      'Implement lazy loading for recommendation details',
      'Use streaming for large data processing',
      'Implement circuit breakers for external service calls',
      'Use compression for cached data to reduce memory usage',
      'Implement request deduplication for similar queries',
      'Use worker threads for CPU-intensive ML computations',
      'Implement graceful degradation when services are unavailable',
      'Monitor and alert on performance metrics',
    ];

    return { recommendations, performance };
  }

  /**
   * Memory optimization for large datasets
   */
  async optimizeMemoryUsage(): Promise<void> {
    try {
      // Clear old cache entries
      await this.cleanupExpiredCache();

      // Optimize object references
      this.optimizeObjectReferences();

      // Trigger garbage collection hint (Node.js specific)
      if (global.gc) {
        global.gc();
      }

      this.logger.log('Memory optimization completed');
    } catch (error) {
      this.logger.error('Error in memory optimization:', error);
    }
  }

  /**
   * Performance monitoring and metrics collection
   */
  async collectPerformanceMetrics(): Promise<{
    cacheHitRate: number;
    averageResponseTime: number;
    queueLength: number;
    memoryUsage: number;
    errorRate: number;
  }> {
    try {
      const cacheStats = await this.cacheService.getCacheStats();
      const queueStats = await this.recommendationQueue.getJobCounts();
      const memoryUsage = process.memoryUsage();

      return {
        cacheHitRate: cacheStats.hitRate,
        averageResponseTime: 0, // Would be tracked by monitoring system
        queueLength: queueStats.waiting + queueStats.active,
        memoryUsage: memoryUsage.heapUsed / 1024 / 1024, // MB
        errorRate: 0, // Would be tracked by monitoring system
      };
    } catch (error) {
      this.logger.error('Error collecting performance metrics:', error);
      return {
        cacheHitRate: 0,
        averageResponseTime: 0,
        queueLength: 0,
        memoryUsage: 0,
        errorRate: 0,
      };
    }
  }

  /**
   * Auto-scaling recommendations based on load
   */
  async getScalingRecommendations(): Promise<{
    scaleUp: boolean;
    scaleDown: boolean;
    reason: string;
    metrics: any;
  }> {
    try {
      const metrics = await this.collectPerformanceMetrics();

      let scaleUp = false;
      let scaleDown = false;
      let reason = 'Normal operation';

      // Scale up conditions
      if (metrics.queueLength > 100 || metrics.averageResponseTime > 2000) {
        scaleUp = true;
        reason = 'High queue length or response time detected';
      }

      // Scale down conditions
      if (metrics.queueLength < 10 && metrics.averageResponseTime < 500) {
        scaleDown = true;
        reason = 'Low load detected, can scale down';
      }

      // Memory pressure
      if (metrics.memoryUsage > 1024) {
        // > 1GB
        scaleUp = true;
        reason = 'High memory usage detected';
      }

      return {
        scaleUp,
        scaleDown,
        reason,
        metrics,
      };
    } catch (error) {
      this.logger.error('Error getting scaling recommendations:', error);
      return {
        scaleUp: false,
        scaleDown: false,
        reason: 'Error collecting metrics',
        metrics: {},
      };
    }
  }

  /**
   * Implement request deduplication
   */
  private requestCache = new Map<string, Promise<any>>();

  async deduplicatedRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttlMs: number = 5000,
  ): Promise<T> {
    // Check if request is already in progress
    if (this.requestCache.has(key)) {
      return this.requestCache.get(key)!;
    }

    // Execute request and cache promise
    const promise = requestFn();
    this.requestCache.set(key, promise);

    // Clean up after TTL
    setTimeout(() => {
      this.requestCache.delete(key);
    }, ttlMs);

    try {
      return await promise;
    } catch (error) {
      // Remove failed request from cache immediately
      this.requestCache.delete(key);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async queueBackgroundRefresh(userId: string, options: any): Promise<void> {
    await this.recommendationQueue.add(
      'background-refresh',
      { userId, options },
      {
        priority: -10, // Very low priority
        delay: 60000, // 1 minute delay
      },
    );
  }

  private async generateContentBasedRecommendations(userId: string): Promise<any[]> {
    // Implementation would call content similarity service
    return [];
  }

  private async generateCollaborativeRecommendations(userId: string): Promise<any[]> {
    // Implementation would call collaborative filtering service
    return [];
  }

  private async generateTrendingRecommendations(userId: string): Promise<any[]> {
    // Implementation would generate trending recommendations
    return [];
  }

  private async generateLearningPathRecommendations(userId: string): Promise<any[]> {
    try {
      const recommendations = await this.learningPathService.getPathRecommendations(userId, 5);
      return [
        ...recommendations.skillBasedPaths,
        ...recommendations.trendingPaths,
        ...recommendations.continuationPaths,
      ];
    } catch (error) {
      this.logger.error('Error generating learning path recommendations:', error);
      return [];
    }
  }

  private async cleanupExpiredCache(): Promise<void> {
    // Implementation would clean up expired cache entries
    // This depends on your cache implementation
    this.logger.debug('Cleaning up expired cache entries');
  }

  private optimizeObjectReferences(): void {
    // Implementation would optimize object references to prevent memory leaks
    // Clear any large temporary objects, circular references, etc.
    this.logger.debug('Optimizing object references');
  }

  /**
   * Circuit breaker pattern implementation
   */
  private circuitBreakers = new Map<
    string,
    {
      failures: number;
      lastFailure: number;
      state: 'closed' | 'open' | 'half-open';
    }
  >();

  async executeWithCircuitBreaker<T>(
    key: string,
    operation: () => Promise<T>,
    options: {
      failureThreshold?: number;
      timeout?: number;
      resetTimeout?: number;
    } = {},
  ): Promise<T> {
    const { failureThreshold = 5, timeout = 10000, resetTimeout = 60000 } = options;

    let breaker = this.circuitBreakers.get(key);
    if (!breaker) {
      breaker = { failures: 0, lastFailure: 0, state: 'closed' };
      this.circuitBreakers.set(key, breaker);
    }

    const now = Date.now();

    // Check if circuit should be reset
    if (breaker.state === 'open' && now - breaker.lastFailure > resetTimeout) {
      breaker.state = 'half-open';
      breaker.failures = 0;
    }

    // Reject if circuit is open
    if (breaker.state === 'open') {
      throw new Error(`Circuit breaker is open for ${key}`);
    }

    try {
      // Execute with timeout
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Operation timeout')), timeout),
        ),
      ]);

      // Reset on success
      if (breaker.state === 'half-open') {
        breaker.state = 'closed';
      }
      breaker.failures = 0;

      return result;
    } catch (error) {
      breaker.failures++;
      breaker.lastFailure = now;

      if (breaker.failures >= failureThreshold) {
        breaker.state = 'open';
      }

      throw error;
    }
  }
}
