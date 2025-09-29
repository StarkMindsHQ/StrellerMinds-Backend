/**
 * Content Recommendation Engine Usage Examples
 * 
 * This file demonstrates various ways to use the recommendation engine
 * in different scenarios and use cases.
 */

import { Injectable, Logger } from '@nestjs/common';
import { RecommendationEngineService } from '../services/recommendation-engine.service';
import { LearningPathService } from '../services/learning-path.service';
import { RecommendationAnalyticsService } from '../services/recommendation-analytics.service';
import { RecommendationCacheService } from '../services/recommendation-cache.service';
import { PerformanceOptimizationService } from '../services/performance-optimization.service';
import { RecommendationType, RecommendationReason } from '../entities/recommendation.entity';

@Injectable()
export class RecommendationUsageExamples {
  private readonly logger = new Logger(RecommendationUsageExamples.name);

  constructor(
    private recommendationService: RecommendationEngineService,
    private learningPathService: LearningPathService,
    private analyticsService: RecommendationAnalyticsService,
    private cacheService: RecommendationCacheService,
    private performanceService: PerformanceOptimizationService,
  ) {}

  /**
   * Example 1: Basic Recommendation Generation
   * Generate simple personalized recommendations for a user
   */
  async basicRecommendations(userId: string) {
    try {
      const recommendations = await this.recommendationService.generateRecommendations({
        userId,
        limit: 10,
        minConfidence: 0.3,
      });

      console.log(`Generated ${recommendations.length} recommendations for user ${userId}`);
      
      return recommendations.map(rec => ({
        courseId: rec.courseId,
        title: rec.course?.title,
        reason: rec.explanation,
        confidence: rec.confidenceScore,
        type: rec.recommendationType,
      }));
    } catch (error) {
      this.logger.error('Error in basic recommendations:', error);
      throw error;
    }
  }

  /**
   * Example 2: Contextual Recommendations
   * Generate recommendations based on user context (device, location, time)
   */
  async contextualRecommendations(userId: string, context: {
    deviceType: string;
    sessionId: string;
    currentPage: string;
    timeOfDay: string;
  }) {
    try {
      const recommendations = await this.recommendationService.generateRecommendations({
        userId,
        limit: 8,
        minConfidence: 0.2,
        context: {
          userId,
          deviceType: context.deviceType,
          sessionId: context.sessionId,
          context: context.currentPage,
        },
      });

      // Filter recommendations based on context
      const filteredRecs = recommendations.filter(rec => {
        // Example: Show shorter courses on mobile
        if (context.deviceType === 'mobile' && rec.course?.duration > 60) {
          return false;
        }
        
        // Example: Show beginner courses in the evening
        if (context.timeOfDay === 'evening' && rec.course?.difficulty === 'advanced') {
          return false;
        }
        
        return true;
      });

      return filteredRecs;
    } catch (error) {
      this.logger.error('Error in contextual recommendations:', error);
      throw error;
    }
  }

  /**
   * Example 3: Skill-Based Learning Path
   * Create a learning path for specific skills
   */
  async createSkillBasedLearningPath(userId: string, targetSkills: string[]) {
    try {
      const learningGoal = {
        targetSkills,
        currentLevel: 'beginner' as const,
        targetLevel: 'intermediate' as const,
        timeframe: 12, // weeks
        preferences: {
          maxCoursesPerWeek: 2,
          preferredDuration: 90, // minutes
          includeTopics: ['Practical Projects', 'Hands-on Learning'],
          excludeTopics: ['Theory Only'],
        },
      };

      const options = {
        maxCourses: 8,
        includeAssessments: true,
        includeProjects: true,
        adaptToProgress: true,
        considerPrerequisites: true,
      };

      const learningPath = await this.learningPathService.generateLearningPath(
        userId,
        learningGoal,
        options
      );

      return {
        pathId: learningPath.id,
        title: learningPath.title,
        estimatedDuration: learningPath.estimatedDuration,
        totalSteps: learningPath.totalSteps,
        skills: learningPath.targetSkills,
        steps: learningPath.steps?.map(step => ({
          id: step.id,
          title: step.title,
          type: step.stepType,
          duration: step.estimatedDuration,
          order: step.stepOrder,
        })),
      };
    } catch (error) {
      this.logger.error('Error creating skill-based learning path:', error);
      throw error;
    }
  }

  /**
   * Example 4: Recommendation with Caching
   * Implement caching for better performance
   */
  async cachedRecommendations(userId: string) {
    try {
      const cacheKey = { userId, context: 'homepage' };
      
      // Try to get from cache first
      let recommendations = await this.cacheService.getCachedRecommendations(userId, cacheKey);
      
      if (!recommendations) {
        // Generate fresh recommendations
        recommendations = await this.recommendationService.generateRecommendations({
          userId,
          limit: 10,
          minConfidence: 0.3,
        });

        // Cache for future requests
        await this.cacheService.cacheRecommendations(userId, cacheKey, recommendations);
        
        this.logger.log(`Generated and cached recommendations for user ${userId}`);
      } else {
        this.logger.log(`Served cached recommendations for user ${userId}`);
      }

      return recommendations;
    } catch (error) {
      this.logger.error('Error in cached recommendations:', error);
      throw error;
    }
  }

  /**
   * Example 5: Batch Recommendation Processing
   * Process recommendations for multiple users efficiently
   */
  async batchProcessRecommendations(userIds: string[]) {
    try {
      await this.performanceService.batchGenerateRecommendations(userIds, {
        limit: 10,
        minConfidence: 0.2,
        refreshCache: false,
        priority: 1,
      });

      this.logger.log(`Queued batch processing for ${userIds.length} users`);
      
      return {
        success: true,
        message: `Batch processing initiated for ${userIds.length} users`,
        estimatedCompletionTime: userIds.length * 2, // seconds
      };
    } catch (error) {
      this.logger.error('Error in batch processing:', error);
      throw error;
    }
  }

  /**
   * Example 6: Real-time Recommendation Updates
   * Update recommendations based on user interactions
   */
  async handleUserInteraction(userId: string, interactionData: {
    recommendationId: string;
    interactionType: 'view' | 'click' | 'dismiss' | 'enroll';
    courseId: string;
    metadata?: any;
  }) {
    try {
      // Record the interaction
      await this.recommendationService.recordInteraction(
        interactionData.recommendationId,
        interactionData.interactionType,
        interactionData.metadata
      );

      // If user enrolled, invalidate cache to refresh recommendations
      if (interactionData.interactionType === 'enroll') {
        await this.cacheService.invalidateRecommendationCache(userId);
        
        // Generate fresh recommendations in background
        setTimeout(async () => {
          await this.recommendationService.generateRecommendations({
            userId,
            limit: 10,
          });
        }, 1000);
      }

      return {
        success: true,
        message: 'Interaction recorded successfully',
        shouldRefresh: interactionData.interactionType === 'enroll',
      };
    } catch (error) {
      this.logger.error('Error handling user interaction:', error);
      throw error;
    }
  }

  /**
   * Example 7: A/B Testing for Recommendations
   * Test different recommendation algorithms
   */
  async abTestRecommendations(userId: string, testGroup: 'A' | 'B') {
    try {
      let recommendations;

      if (testGroup === 'A') {
        // Algorithm A: Focus on collaborative filtering
        recommendations = await this.recommendationService.generateRecommendations({
          userId,
          limit: 10,
          minConfidence: 0.3,
          includeReasons: [RecommendationReason.SIMILAR_USERS, RecommendationReason.COLLABORATIVE_FILTERING],
        });
      } else {
        // Algorithm B: Focus on content similarity
        recommendations = await this.recommendationService.generateRecommendations({
          userId,
          limit: 10,
          minConfidence: 0.3,
          includeReasons: [RecommendationReason.SIMILAR_CONTENT, RecommendationReason.SKILL_BASED],
        });
      }

      // Track A/B test metrics
      await this.analyticsService.trackRecommendationGeneration({
        userId,
        recommendationIds: recommendations.map(r => r.id),
        algorithmVersion: `ab_test_${testGroup.toLowerCase()}`,
        generationTimeMs: Date.now(),
        context: { abTestGroup: testGroup },
      });

      return {
        testGroup,
        recommendations: recommendations.map(rec => ({
          id: rec.id,
          courseId: rec.courseId,
          confidence: rec.confidenceScore,
          reason: rec.reason,
        })),
      };
    } catch (error) {
      this.logger.error('Error in A/B test recommendations:', error);
      throw error;
    }
  }

  /**
   * Example 8: Recommendation Analytics Dashboard
   * Get comprehensive analytics for recommendations
   */
  async getRecommendationDashboard(userId: string, days: number = 30) {
    try {
      const analytics = await this.analyticsService.getUserAnalytics(userId, days);
      const performanceMetrics = await this.performanceService.collectPerformanceMetrics();

      return {
        user: {
          totalRecommendations: analytics.totalRecommendationsReceived,
          totalInteractions: analytics.totalInteractions,
          engagementRate: analytics.totalInteractions / analytics.totalRecommendationsReceived,
          averageRating: analytics.averageFeedbackScore,
          topReasons: analytics.topRecommendationReasons,
          engagementTrend: analytics.engagementTrend,
        },
        system: {
          cacheHitRate: performanceMetrics.cacheHitRate,
          averageResponseTime: performanceMetrics.averageResponseTime,
          queueLength: performanceMetrics.queueLength,
          memoryUsage: performanceMetrics.memoryUsage,
          errorRate: performanceMetrics.errorRate,
        },
      };
    } catch (error) {
      this.logger.error('Error getting recommendation dashboard:', error);
      throw error;
    }
  }

  /**
   * Example 9: Personalized Course Discovery
   * Enhanced course discovery with recommendations
   */
  async enhancedCourseDiscovery(userId: string, searchQuery?: string, filters?: {
    difficulty?: string;
    duration?: number;
    topics?: string[];
  }) {
    try {
      // Get base recommendations
      const recommendations = await this.recommendationService.generateRecommendations({
        userId,
        limit: 20,
        minConfidence: 0.1,
      });

      // Apply search and filters if provided
      let filteredCourses = recommendations;

      if (searchQuery) {
        filteredCourses = filteredCourses.filter(rec => 
          rec.course?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rec.course?.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      if (filters) {
        if (filters.difficulty) {
          filteredCourses = filteredCourses.filter(rec => 
            rec.course?.difficulty === filters.difficulty
          );
        }

        if (filters.duration) {
          filteredCourses = filteredCourses.filter(rec => 
            (rec.course?.duration || 0) <= filters.duration!
          );
        }

        if (filters.topics?.length) {
          filteredCourses = filteredCourses.filter(rec => 
            rec.course?.tags?.some(tag => filters.topics!.includes(tag))
          );
        }
      }

      // Sort by relevance and confidence
      filteredCourses.sort((a, b) => {
        const scoreA = (a.relevanceScore || 0) * (a.confidenceScore || 0);
        const scoreB = (b.relevanceScore || 0) * (b.confidenceScore || 0);
        return scoreB - scoreA;
      });

      return {
        courses: filteredCourses.slice(0, 12).map(rec => ({
          id: rec.courseId,
          title: rec.course?.title,
          description: rec.course?.description,
          difficulty: rec.course?.difficulty,
          duration: rec.course?.duration,
          rating: rec.course?.rating,
          tags: rec.course?.tags,
          recommendationScore: rec.confidenceScore,
          recommendationReason: rec.explanation,
        })),
        totalFound: filteredCourses.length,
        searchQuery,
        filters,
      };
    } catch (error) {
      this.logger.error('Error in enhanced course discovery:', error);
      throw error;
    }
  }

  /**
   * Example 10: Learning Path Progress Tracking
   * Track and adapt learning path based on progress
   */
  async trackLearningPathProgress(userId: string, pathId: string) {
    try {
      // Get current learning path
      const learningPath = await this.learningPathService.getUserLearningPaths(userId, {
        limit: 1,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });

      const path = learningPath.paths.find(p => p.id === pathId);
      if (!path) {
        throw new Error(`Learning path ${pathId} not found`);
      }

      // Check if adaptation is needed
      if (path.progressPercentage > 50) {
        await this.learningPathService.adaptLearningPath(pathId);
      }

      // Get recommended next steps
      const nextSteps = path.steps
        ?.filter(step => !step.completed)
        .slice(0, 3)
        .map(step => ({
          id: step.id,
          title: step.title,
          type: step.stepType,
          estimatedDuration: step.estimatedDuration,
          order: step.stepOrder,
        }));

      return {
        pathId: path.id,
        title: path.title,
        progress: {
          percentage: path.progressPercentage,
          completedSteps: path.completedSteps,
          totalSteps: path.totalSteps,
          status: path.status,
        },
        nextSteps,
        estimatedTimeToComplete: path.estimatedDuration - (path.completedSteps * 60), // rough estimate
      };
    } catch (error) {
      this.logger.error('Error tracking learning path progress:', error);
      throw error;
    }
  }
}

/**
 * Frontend Integration Examples
 */

// React Hook Example
export const useRecommendations = (userId: string) => {
  // This would be implemented in your React frontend
  /*
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/recommendations?limit=10`);
      const data = await response.json();
      setRecommendations(data.recommendations);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [userId]);

  return { recommendations, loading, refetch: fetchRecommendations };
  */
};

// Vue.js Composable Example
export const useRecommendationAnalytics = () => {
  // This would be implemented in your Vue.js frontend
  /*
  const analytics = ref(null);
  const loading = ref(false);

  const fetchAnalytics = async (days = 30) => {
    loading.value = true;
    try {
      const response = await fetch(`/api/recommendations/analytics/summary?days=${days}`);
      analytics.value = await response.json();
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      loading.value = false;
    }
  };

  return { analytics, loading, fetchAnalytics };
  */
};

/**
 * Mobile App Integration Examples
 */

// React Native Example
export const MobileRecommendationService = {
  // This would be implemented in your React Native app
  /*
  async getRecommendations(userId, context) {
    const deviceInfo = {
      deviceType: 'mobile',
      platform: Platform.OS,
      screenSize: Dimensions.get('window'),
    };

    const response = await fetch('/api/recommendations/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        limit: 5, // Fewer recommendations for mobile
        minConfidence: 0.4, // Higher confidence for mobile
        deviceType: deviceInfo.deviceType,
        context: { ...context, ...deviceInfo },
      }),
    });

    return response.json();
  },

  async recordInteraction(recommendationId, interactionType) {
    await fetch(`/api/recommendations/${recommendationId}/interact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interactionType }),
    });
  },
  */
};
