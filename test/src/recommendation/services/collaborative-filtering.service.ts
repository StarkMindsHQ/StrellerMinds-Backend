import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserInteraction, InteractionType } from '../entities/user-interaction.entity';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { Recommendation, RecommendationType, RecommendationReason } from '../entities/recommendation.entity';
import { RecommendationContext } from './recommendation-engine.service';

interface UserSimilarity {
  userId: string;
  similarity: number;
  commonInteractions: number;
  user?: User;
}

interface ItemSimilarity {
  courseId: string;
  similarity: number;
  commonUsers: number;
  course?: Course;
}

interface CollaborativeRecommendation {
  courseId: string;
  score: number;
  reason: string;
  similarUsers?: string[];
  similarItems?: string[];
}

@Injectable()
export class CollaborativeFilteringService {
  private readonly logger = new Logger(CollaborativeFilteringService.name);
  private userSimilarityCache = new Map<string, UserSimilarity[]>();
  private itemSimilarityCache = new Map<string, ItemSimilarity[]>();
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    @InjectRepository(UserInteraction)
    private interactionRepository: Repository<UserInteraction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  /**
   * Generate recommendations using collaborative filtering
   */
  async generateRecommendations(
    context: RecommendationContext,
    options: { limit: number; minConfidence: number },
  ): Promise<Partial<Recommendation>[]> {
    try {
      this.logger.log(`Generating collaborative filtering recommendations for user ${context.userId}`);

      // Get user-based collaborative filtering recommendations
      const userBasedRecs = await this.getUserBasedRecommendations(context, Math.ceil(options.limit * 0.6));
      
      // Get item-based collaborative filtering recommendations
      const itemBasedRecs = await this.getItemBasedRecommendations(context, Math.ceil(options.limit * 0.4));
      
      // Combine and rank recommendations
      const combinedRecs = [...userBasedRecs, ...itemBasedRecs];
      const rankedRecs = this.rankCollaborativeRecommendations(combinedRecs);
      
      // Filter by confidence and limit
      const filteredRecs = rankedRecs
        .filter(rec => rec.score >= options.minConfidence)
        .slice(0, options.limit);

      // Convert to recommendation format
      return filteredRecs.map(rec => this.createRecommendation(rec, context));

    } catch (error) {
      this.logger.error('Error generating collaborative filtering recommendations:', error);
      return [];
    }
  }

  /**
   * Find similar users based on interaction patterns
   */
  async findSimilarUsers(userId: string, limit: number = 20): Promise<UserSimilarity[]> {
    // Check cache first
    const cacheKey = `user_${userId}`;
    const cached = this.userSimilarityCache.get(cacheKey);
    if (cached && this.isCacheValid(cacheKey)) {
      return cached.slice(0, limit);
    }

    try {
      // Get user's interactions
      const userInteractions = await this.getUserInteractions(userId);
      if (userInteractions.length === 0) {
        return [];
      }

      // Get all other users who have interacted with similar content
      const courseIds = userInteractions.map(i => i.courseId).filter(Boolean);
      const otherUsers = await this.interactionRepository
        .createQueryBuilder('interaction')
        .select('DISTINCT interaction.userId')
        .where('interaction.courseId IN (:...courseIds)', { courseIds })
        .andWhere('interaction.userId != :userId', { userId })
        .getRawMany();

      // Calculate similarity with each user
      const similarities: UserSimilarity[] = [];
      
      for (const { userId: otherUserId } of otherUsers) {
        const otherInteractions = await this.getUserInteractions(otherUserId);
        const similarity = this.calculateUserSimilarity(userInteractions, otherInteractions);
        
        if (similarity.similarity > 0.1) { // Only include users with meaningful similarity
          similarities.push({
            userId: otherUserId,
            similarity: similarity.similarity,
            commonInteractions: similarity.commonInteractions,
          });
        }
      }

      // Sort by similarity and cache
      similarities.sort((a, b) => b.similarity - a.similarity);
      this.userSimilarityCache.set(cacheKey, similarities);
      
      return similarities.slice(0, limit);

    } catch (error) {
      this.logger.error(`Error finding similar users for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Find similar items (courses) based on user interaction patterns
   */
  async findSimilarItems(courseId: string, limit: number = 20): Promise<ItemSimilarity[]> {
    // Check cache first
    const cacheKey = `item_${courseId}`;
    const cached = this.itemSimilarityCache.get(cacheKey);
    if (cached && this.isCacheValid(cacheKey)) {
      return cached.slice(0, limit);
    }

    try {
      // Get users who interacted with this course
      const courseUsers = await this.interactionRepository.find({
        where: { courseId },
        select: ['userId'],
      });

      if (courseUsers.length === 0) {
        return [];
      }

      const userIds = courseUsers.map(u => u.userId);

      // Get other courses these users interacted with
      const otherCourses = await this.interactionRepository
        .createQueryBuilder('interaction')
        .select('DISTINCT interaction.courseId')
        .where('interaction.userId IN (:...userIds)', { userIds })
        .andWhere('interaction.courseId != :courseId', { courseId })
        .getRawMany();

      // Calculate similarity with each course
      const similarities: ItemSimilarity[] = [];
      
      for (const { courseId: otherCourseId } of otherCourses) {
        const otherCourseUsers = await this.interactionRepository.find({
          where: { courseId: otherCourseId },
          select: ['userId'],
        });

        const similarity = this.calculateItemSimilarity(
          userIds,
          otherCourseUsers.map(u => u.userId)
        );

        if (similarity.similarity > 0.1) {
          similarities.push({
            courseId: otherCourseId,
            similarity: similarity.similarity,
            commonUsers: similarity.commonUsers,
          });
        }
      }

      // Sort by similarity and cache
      similarities.sort((a, b) => b.similarity - a.similarity);
      this.itemSimilarityCache.set(cacheKey, similarities);
      
      return similarities.slice(0, limit);

    } catch (error) {
      this.logger.error(`Error finding similar items for ${courseId}:`, error);
      return [];
    }
  }

  /**
   * Get user-based collaborative filtering recommendations
   */
  private async getUserBasedRecommendations(
    context: RecommendationContext,
    limit: number,
  ): Promise<CollaborativeRecommendation[]> {
    // Find similar users
    const similarUsers = await this.findSimilarUsers(context.userId, 50);
    
    if (similarUsers.length === 0) {
      return [];
    }

    // Get courses that similar users liked but current user hasn't interacted with
    const userCourseIds = new Set(
      context.recentInteractions?.map(i => i.courseId).filter(Boolean) || []
    );

    const recommendations = new Map<string, {
      score: number;
      count: number;
      similarUsers: string[];
    }>();

    for (const similarUser of similarUsers.slice(0, 20)) { // Top 20 similar users
      const similarUserInteractions = await this.getUserInteractions(similarUser.userId);
      
      // Find highly rated interactions from similar users
      const positiveInteractions = similarUserInteractions.filter(interaction =>
        this.isPositiveInteraction(interaction) && 
        !userCourseIds.has(interaction.courseId)
      );

      for (const interaction of positiveInteractions) {
        if (!interaction.courseId) continue;

        const existing = recommendations.get(interaction.courseId) || {
          score: 0,
          count: 0,
          similarUsers: [],
        };

        // Weight by user similarity and interaction strength
        const interactionWeight = this.getInteractionWeight(interaction);
        const weightedScore = similarUser.similarity * interactionWeight;

        existing.score += weightedScore;
        existing.count += 1;
        existing.similarUsers.push(similarUser.userId);
        
        recommendations.set(interaction.courseId, existing);
      }
    }

    // Convert to recommendation format and sort
    const result: CollaborativeRecommendation[] = [];
    
    for (const [courseId, data] of recommendations.entries()) {
      const normalizedScore = data.score / Math.max(data.count, 1);
      
      result.push({
        courseId,
        score: normalizedScore,
        reason: `Recommended by ${data.count} similar learners`,
        similarUsers: data.similarUsers.slice(0, 5),
      });
    }

    return result
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get item-based collaborative filtering recommendations
   */
  private async getItemBasedRecommendations(
    context: RecommendationContext,
    limit: number,
  ): Promise<CollaborativeRecommendation[]> {
    // Get courses user has positively interacted with
    const userInteractions = context.recentInteractions || [];
    const positiveCourses = userInteractions
      .filter(i => this.isPositiveInteraction(i) && i.courseId)
      .map(i => i.courseId!)
      .slice(0, 10); // Consider top 10 courses

    if (positiveCourses.length === 0) {
      return [];
    }

    const recommendations = new Map<string, {
      score: number;
      count: number;
      similarItems: string[];
    }>();

    // For each course user liked, find similar courses
    for (const courseId of positiveCourses) {
      const similarItems = await this.findSimilarItems(courseId, 20);
      
      for (const similarItem of similarItems) {
        // Skip if user already interacted with this course
        if (positiveCourses.includes(similarItem.courseId)) continue;

        const existing = recommendations.get(similarItem.courseId) || {
          score: 0,
          count: 0,
          similarItems: [],
        };

        existing.score += similarItem.similarity;
        existing.count += 1;
        existing.similarItems.push(courseId);
        
        recommendations.set(similarItem.courseId, existing);
      }
    }

    // Convert to recommendation format and sort
    const result: CollaborativeRecommendation[] = [];
    
    for (const [courseId, data] of recommendations.entries()) {
      const normalizedScore = data.score / Math.max(data.count, 1);
      
      result.push({
        courseId,
        score: normalizedScore,
        reason: `Similar to ${data.count} courses you've engaged with`,
        similarItems: data.similarItems.slice(0, 3),
      });
    }

    return result
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get user interactions with weighted values
   */
  private async getUserInteractions(userId: string): Promise<UserInteraction[]> {
    return await this.interactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 500, // Limit for performance
      relations: ['course'],
    });
  }

  /**
   * Calculate similarity between two users based on their interactions
   */
  private calculateUserSimilarity(
    user1Interactions: UserInteraction[],
    user2Interactions: UserInteraction[],
  ): { similarity: number; commonInteractions: number } {
    // Create maps of course interactions for each user
    const user1Courses = new Map<string, number>();
    const user2Courses = new Map<string, number>();

    // Build weighted interaction maps
    user1Interactions.forEach(interaction => {
      if (interaction.courseId) {
        const weight = this.getInteractionWeight(interaction);
        user1Courses.set(
          interaction.courseId,
          (user1Courses.get(interaction.courseId) || 0) + weight
        );
      }
    });

    user2Interactions.forEach(interaction => {
      if (interaction.courseId) {
        const weight = this.getInteractionWeight(interaction);
        user2Courses.set(
          interaction.courseId,
          (user2Courses.get(interaction.courseId) || 0) + weight
        );
      }
    });

    // Find common courses
    const commonCourses = new Set([...user1Courses.keys()].filter(courseId => 
      user2Courses.has(courseId)
    ));

    if (commonCourses.size === 0) {
      return { similarity: 0, commonInteractions: 0 };
    }

    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    // Calculate for all courses (not just common ones)
    const allCourses = new Set([...user1Courses.keys(), ...user2Courses.keys()]);
    
    for (const courseId of allCourses) {
      const rating1 = user1Courses.get(courseId) || 0;
      const rating2 = user2Courses.get(courseId) || 0;
      
      dotProduct += rating1 * rating2;
      norm1 += rating1 * rating1;
      norm2 += rating2 * rating2;
    }

    const similarity = (norm1 > 0 && norm2 > 0) 
      ? dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
      : 0;

    return {
      similarity: Math.max(0, Math.min(1, similarity)),
      commonInteractions: commonCourses.size,
    };
  }

  /**
   * Calculate similarity between two items based on user interactions
   */
  private calculateItemSimilarity(
    item1Users: string[],
    item2Users: string[],
  ): { similarity: number; commonUsers: number } {
    const users1Set = new Set(item1Users);
    const users2Set = new Set(item2Users);
    
    // Calculate Jaccard similarity
    const intersection = new Set([...users1Set].filter(userId => users2Set.has(userId)));
    const union = new Set([...users1Set, ...users2Set]);
    
    const similarity = union.size > 0 ? intersection.size / union.size : 0;
    
    return {
      similarity,
      commonUsers: intersection.size,
    };
  }

  /**
   * Get weight for different interaction types
   */
  private getInteractionWeight(interaction: UserInteraction): number {
    const weights = {
      [InteractionType.VIEW]: 0.1,
      [InteractionType.CLICK]: 0.2,
      [InteractionType.ENROLL]: 0.8,
      [InteractionType.START]: 0.6,
      [InteractionType.PROGRESS]: 0.7,
      [InteractionType.COMPLETE]: 1.0,
      [InteractionType.RATE]: 0.9,
      [InteractionType.BOOKMARK]: 0.5,
      [InteractionType.SHARE]: 0.4,
      [InteractionType.DOWNLOAD]: 0.3,
    };

    let baseWeight = weights[interaction.interactionType] || 0.1;
    
    // Apply additional weighting based on interaction metadata
    if (interaction.weightedValue) {
      baseWeight *= interaction.weightedValue;
    }

    return Math.max(0, Math.min(1, baseWeight));
  }

  /**
   * Check if interaction is positive (indicates user interest/satisfaction)
   */
  private isPositiveInteraction(interaction: UserInteraction): boolean {
    const positiveTypes = [
      InteractionType.ENROLL,
      InteractionType.COMPLETE,
      InteractionType.RATE,
      InteractionType.BOOKMARK,
      InteractionType.SHARE,
      InteractionType.PROGRESS,
    ];

    return positiveTypes.includes(interaction.interactionType) ||
           (interaction.weightedValue && interaction.weightedValue > 0.5);
  }

  /**
   * Rank collaborative recommendations by combining scores
   */
  private rankCollaborativeRecommendations(
    recommendations: CollaborativeRecommendation[],
  ): CollaborativeRecommendation[] {
    // Remove duplicates and combine scores
    const combined = new Map<string, CollaborativeRecommendation>();
    
    recommendations.forEach(rec => {
      const existing = combined.get(rec.courseId);
      
      if (existing) {
        // Combine scores using weighted average
        existing.score = (existing.score + rec.score) / 2;
        existing.reason = `${existing.reason} and ${rec.reason}`;
        
        if (rec.similarUsers) {
          existing.similarUsers = [...(existing.similarUsers || []), ...rec.similarUsers];
        }
        if (rec.similarItems) {
          existing.similarItems = [...(existing.similarItems || []), ...rec.similarItems];
        }
      } else {
        combined.set(rec.courseId, { ...rec });
      }
    });

    return Array.from(combined.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Create recommendation from collaborative recommendation
   */
  private createRecommendation(
    colabRec: CollaborativeRecommendation,
    context: RecommendationContext,
  ): Partial<Recommendation> {
    const hasUserBased = colabRec.similarUsers && colabRec.similarUsers.length > 0;
    const hasItemBased = colabRec.similarItems && colabRec.similarItems.length > 0;
    
    let reason: RecommendationReason;
    if (hasUserBased && hasItemBased) {
      reason = RecommendationReason.COLLABORATIVE_FILTERING;
    } else if (hasUserBased) {
      reason = RecommendationReason.SIMILAR_USERS;
    } else {
      reason = RecommendationReason.SIMILAR_CONTENT;
    }

    return {
      userId: context.userId,
      courseId: colabRec.courseId,
      recommendationType: RecommendationType.COLLABORATIVE,
      reason,
      confidenceScore: colabRec.score,
      relevanceScore: colabRec.score * 0.9,
      priority: this.calculatePriority(colabRec.score),
      explanation: colabRec.reason,
      metadata: {
        algorithmUsed: 'collaborative_filtering',
        collaborativeScore: colabRec.score,
        similarUsers: colabRec.similarUsers?.slice(0, 3) || [],
        similarItems: colabRec.similarItems?.slice(0, 3) || [],
        recommendationType: hasUserBased ? 'user_based' : 'item_based',
      },
    };
  }

  /**
   * Calculate priority based on collaborative score
   */
  private calculatePriority(score: number): number {
    if (score >= 0.8) return 5;
    if (score >= 0.6) return 4;
    if (score >= 0.4) return 3;
    if (score >= 0.2) return 2;
    return 1;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(cacheKey: string): boolean {
    // Simple time-based cache validation
    // In a real implementation, you might want more sophisticated cache invalidation
    return true; // Placeholder - implement based on your caching strategy
  }

  /**
   * Clear similarity caches (useful for testing or manual cache refresh)
   */
  clearCache(): void {
    this.userSimilarityCache.clear();
    this.itemSimilarityCache.clear();
    this.logger.log('Collaborative filtering caches cleared');
  }
}
