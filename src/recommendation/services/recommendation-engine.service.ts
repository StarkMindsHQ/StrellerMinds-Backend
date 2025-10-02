import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan, LessThan } from 'typeorm';
import {
  Recommendation,
  RecommendationType,
  RecommendationReason,
  RecommendationStatus,
} from '../entities/recommendation.entity';
import { UserInteraction, InteractionType } from '../entities/user-interaction.entity';
import { LearningPath } from '../entities/learning-path.entity';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { CreateRecommendationDto, GetRecommendationsQueryDto } from '../dto/recommendation.dto';
import { RecommendationAnalyticsService } from './recommendation-analytics.service';
import { MLPersonalizationService } from './ml-personalization.service';
import { ContentSimilarityService } from './content-similarity.service';
import { CollaborativeFilteringService } from './collaborative-filtering.service';

export interface RecommendationContext {
  userId: string;
  sessionId?: string;
  deviceType?: string;
  context?: string;
  currentCourse?: string;
  recentInteractions?: UserInteraction[];
  userProfile?: any;
  preferences?: Record<string, any>;
}

export interface RecommendationRequest {
  userId: string;
  type?: RecommendationType;
  limit?: number;
  minConfidence?: number;
  context?: RecommendationContext;
  excludeCourseIds?: string[];
  includeReasons?: RecommendationReason[];
}

@Injectable()
export class RecommendationEngineService {
  private readonly logger = new Logger(RecommendationEngineService.name);

  constructor(
    @InjectRepository(Recommendation)
    private recommendationRepository: Repository<Recommendation>,
    @InjectRepository(UserInteraction)
    private interactionRepository: Repository<UserInteraction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    private analyticsService: RecommendationAnalyticsService,
    private mlService: MLPersonalizationService,
    private similarityService: ContentSimilarityService,
    private collaborativeService: CollaborativeFilteringService,
  ) {}

  /**
   * Generate personalized recommendations for a user
   */
  async generateRecommendations(request: RecommendationRequest): Promise<Recommendation[]> {
    const startTime = Date.now();
    this.logger.log(`Generating recommendations for user ${request.userId}`);

    try {
      // Get user profile and interaction history
      const user = await this.userRepository.findOne({ where: { id: request.userId } });
      if (!user) {
        throw new Error(`User ${request.userId} not found`);
      }

      const context = await this.buildRecommendationContext(request);

      // Generate recommendations using multiple algorithms
      const recommendations = await this.generateMultiAlgorithmRecommendations(context, request);

      // Rank and filter recommendations
      const rankedRecommendations = await this.rankRecommendations(recommendations, context);

      // Apply business rules and filters
      const filteredRecommendations = await this.applyBusinessRules(rankedRecommendations, request);

      // Save recommendations to database
      const savedRecommendations = await this.saveRecommendations(filteredRecommendations);

      // Track analytics
      await this.analyticsService.trackRecommendationGeneration({
        userId: request.userId,
        recommendationIds: savedRecommendations.map((r) => r.id),
        algorithmVersion: 'v2.1',
        generationTimeMs: Date.now() - startTime,
        context: request.context,
      });

      this.logger.log(
        `Generated ${savedRecommendations.length} recommendations for user ${request.userId} in ${Date.now() - startTime}ms`,
      );
      return savedRecommendations;
    } catch (error) {
      this.logger.error(`Error generating recommendations for user ${request.userId}:`, error);
      throw error;
    }
  }

  /**
   * Get existing recommendations for a user
   */
  async getRecommendations(
    userId: string,
    query: GetRecommendationsQueryDto,
  ): Promise<{
    recommendations: Recommendation[];
    total: number;
  }> {
    const queryBuilder = this.recommendationRepository
      .createQueryBuilder('recommendation')
      .leftJoinAndSelect('recommendation.course', 'course')
      .where('recommendation.userId = :userId', { userId });

    // Apply filters
    if (query.type) {
      queryBuilder.andWhere('recommendation.recommendationType = :type', { type: query.type });
    }

    if (query.status) {
      queryBuilder.andWhere('recommendation.status = :status', { status: query.status });
    } else {
      // Default to active recommendations
      queryBuilder.andWhere('recommendation.status = :status', {
        status: RecommendationStatus.ACTIVE,
      });
    }

    if (query.minConfidence) {
      queryBuilder.andWhere('recommendation.confidenceScore >= :minConfidence', {
        minConfidence: query.minConfidence,
      });
    }

    if (!query.includeExpired) {
      queryBuilder.andWhere(
        '(recommendation.expiresAt IS NULL OR recommendation.expiresAt > :now)',
        { now: new Date() },
      );
    }

    // Apply sorting
    const sortField = `recommendation.${query.sortBy}`;
    queryBuilder.orderBy(sortField, query.sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(query.offset).take(query.limit);

    const recommendations = await queryBuilder.getMany();

    return { recommendations, total };
  }

  /**
   * Record user interaction with a recommendation
   */
  async recordInteraction(
    recommendationId: string,
    interactionType: 'view' | 'click' | 'dismiss',
    metadata?: any,
  ): Promise<void> {
    const recommendation = await this.recommendationRepository.findOne({
      where: { id: recommendationId },
    });
    if (!recommendation) {
      throw new Error(`Recommendation ${recommendationId} not found`);
    }

    // Update recommendation based on interaction
    switch (interactionType) {
      case 'view':
        recommendation.viewedAt = new Date();
        break;
      case 'click':
        recommendation.clickedAt = new Date();
        break;
      case 'dismiss':
        recommendation.status = RecommendationStatus.DISMISSED;
        recommendation.dismissedAt = new Date();
        break;
    }

    await this.recommendationRepository.save(recommendation);

    // Track analytics
    await this.analyticsService.trackRecommendationInteraction({
      recommendationId,
      userId: recommendation.userId,
      interactionType,
      metadata,
    });

    // Create user interaction record
    await this.interactionRepository.save({
      userId: recommendation.userId,
      courseId: recommendation.courseId,
      recommendationId,
      interactionType: interactionType as any,
      context: 'recommendation' as any,
      metadata,
    });
  }

  /**
   * Provide feedback on recommendation quality
   */
  async provideFeedback(
    recommendationId: string,
    score: number,
    feedbackType: 'explicit' | 'implicit' = 'explicit',
    comment?: string,
  ): Promise<void> {
    const recommendation = await this.recommendationRepository.findOne({
      where: { id: recommendationId },
    });
    if (!recommendation) {
      throw new Error(`Recommendation ${recommendationId} not found`);
    }

    // Update recommendation metadata with feedback
    recommendation.metadata = {
      ...recommendation.metadata,
      feedback: {
        score,
        feedbackType,
        comment,
        timestamp: new Date(),
      },
    };

    await this.recommendationRepository.save(recommendation);

    // Track feedback for ML model improvement
    await this.analyticsService.trackRecommendationFeedback({
      recommendationId,
      userId: recommendation.userId,
      score,
      feedbackType,
      comment,
    });

    // Update ML model with feedback
    await this.mlService.updateModelWithFeedback(recommendation.userId, recommendationId, score);
  }

  /**
   * Build recommendation context from user data
   */
  private async buildRecommendationContext(
    request: RecommendationRequest,
  ): Promise<RecommendationContext> {
    const { userId } = request;

    // Get recent user interactions
    const recentInteractions = await this.interactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
      relations: ['course'],
    });

    // Get user profile
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['enrollments', 'enrollments.course'],
    });

    return {
      userId,
      recentInteractions,
      userProfile: user,
      ...request.context,
    };
  }

  /**
   * Generate recommendations using multiple algorithms
   */
  private async generateMultiAlgorithmRecommendations(
    context: RecommendationContext,
    request: RecommendationRequest,
  ): Promise<Partial<Recommendation>[]> {
    const recommendations: Partial<Recommendation>[] = [];

    // 1. Collaborative Filtering
    const collaborativeRecs = await this.collaborativeService.generateRecommendations(context, {
      limit: Math.ceil((request.limit || 10) * 0.4),
      minConfidence: request.minConfidence || 0.1,
    });
    recommendations.push(...collaborativeRecs);

    // 2. Content-Based Filtering
    const contentRecs = await this.similarityService.generateContentBasedRecommendations(context, {
      limit: Math.ceil((request.limit || 10) * 0.3),
      minConfidence: request.minConfidence || 0.1,
    });
    recommendations.push(...contentRecs);

    // 3. ML Personalization
    const mlRecs = await this.mlService.generatePersonalizedRecommendations(context, {
      limit: Math.ceil((request.limit || 10) * 0.3),
      minConfidence: request.minConfidence || 0.1,
    });
    recommendations.push(...mlRecs);

    // 4. Trending and Popular Content
    const trendingRecs = await this.generateTrendingRecommendations(context, {
      limit: Math.ceil((request.limit || 10) * 0.2),
    });
    recommendations.push(...trendingRecs);

    // 5. Skill Gap Analysis
    const skillGapRecs = await this.generateSkillGapRecommendations(context, {
      limit: Math.ceil((request.limit || 10) * 0.2),
    });
    recommendations.push(...skillGapRecs);

    return recommendations;
  }

  /**
   * Rank recommendations using ensemble method
   */
  private async rankRecommendations(
    recommendations: Partial<Recommendation>[],
    context: RecommendationContext,
  ): Promise<Partial<Recommendation>[]> {
    // Remove duplicates
    const uniqueRecs = this.removeDuplicateRecommendations(recommendations);

    // Calculate ensemble scores
    for (const rec of uniqueRecs) {
      rec.relevanceScore = await this.calculateEnsembleScore(rec, context);
      rec.priority = this.calculatePriority(rec, context);
    }

    // Sort by relevance score and priority
    return uniqueRecs.sort((a, b) => {
      if (a.priority !== b.priority) {
        return (b.priority || 0) - (a.priority || 0);
      }
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    });
  }

  /**
   * Apply business rules and filters
   */
  private async applyBusinessRules(
    recommendations: Partial<Recommendation>[],
    request: RecommendationRequest,
  ): Promise<Partial<Recommendation>[]> {
    let filtered = recommendations;

    // Exclude specific courses
    if (request.excludeCourseIds?.length) {
      filtered = filtered.filter((rec) => !request.excludeCourseIds!.includes(rec.courseId!));
    }

    // Filter by recommendation reasons
    if (request.includeReasons?.length) {
      filtered = filtered.filter((rec) => request.includeReasons!.includes(rec.reason!));
    }

    // Apply confidence threshold
    if (request.minConfidence) {
      filtered = filtered.filter((rec) => (rec.confidenceScore || 0) >= request.minConfidence!);
    }

    // Limit results
    if (request.limit) {
      filtered = filtered.slice(0, request.limit);
    }

    // Ensure diversity in recommendations
    filtered = this.ensureRecommendationDiversity(filtered);

    return filtered;
  }

  /**
   * Save recommendations to database
   */
  private async saveRecommendations(
    recommendations: Partial<Recommendation>[],
  ): Promise<Recommendation[]> {
    const entities = recommendations.map((rec) => {
      const recommendation = new Recommendation();
      Object.assign(recommendation, rec);
      recommendation.status = RecommendationStatus.ACTIVE;
      recommendation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      return recommendation;
    });

    return await this.recommendationRepository.save(entities);
  }

  /**
   * Generate trending recommendations
   */
  private async generateTrendingRecommendations(
    context: RecommendationContext,
    options: { limit: number },
  ): Promise<Partial<Recommendation>[]> {
    // Get trending courses based on recent interactions
    const trendingCourses = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoin('course.interactions', 'interaction')
      .where('interaction.createdAt > :date', {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      })
      .groupBy('course.id')
      .orderBy('COUNT(interaction.id)', 'DESC')
      .take(options.limit)
      .getMany();

    return trendingCourses.map((course) => ({
      userId: context.userId,
      courseId: course.id,
      recommendationType: RecommendationType.COURSE,
      reason: RecommendationReason.TRENDING,
      confidenceScore: 0.7,
      relevanceScore: 0.6,
      priority: 3,
      explanation: `${course.title} is trending among learners`,
      metadata: {
        algorithmUsed: 'trending',
        trendingScore: Math.random() * 0.3 + 0.7,
      },
    }));
  }

  /**
   * Generate skill gap recommendations
   */
  private async generateSkillGapRecommendations(
    context: RecommendationContext,
    options: { limit: number },
  ): Promise<Partial<Recommendation>[]> {
    // Analyze user's current skills vs. desired skills
    const userSkills = context.userProfile?.skills || [];
    const desiredSkills = context.userProfile?.desiredSkills || [];
    const skillGaps = desiredSkills.filter((skill: string) => !userSkills.includes(skill));

    if (skillGaps.length === 0) {
      return [];
    }

    // Find courses that teach missing skills
    const gapFillingCourses = await this.courseRepository
      .createQueryBuilder('course')
      .where('course.skills && :skillGaps', { skillGaps })
      .take(options.limit)
      .getMany();

    return gapFillingCourses.map((course) => ({
      userId: context.userId,
      courseId: course.id,
      recommendationType: RecommendationType.SKILL_BASED,
      reason: RecommendationReason.SKILL_GAP,
      confidenceScore: 0.8,
      relevanceScore: 0.9,
      priority: 5,
      explanation: `This course helps fill gaps in your skill profile`,
      metadata: {
        algorithmUsed: 'skill_gap',
        skillGaps: skillGaps.slice(0, 3),
      },
    }));
  }

  /**
   * Remove duplicate recommendations
   */
  private removeDuplicateRecommendations(
    recommendations: Partial<Recommendation>[],
  ): Partial<Recommendation>[] {
    const seen = new Set<string>();
    return recommendations.filter((rec) => {
      const key = `${rec.courseId}-${rec.recommendationType}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Calculate ensemble score combining multiple algorithms
   */
  private async calculateEnsembleScore(
    recommendation: Partial<Recommendation>,
    context: RecommendationContext,
  ): Promise<number> {
    const weights = {
      collaborative: 0.3,
      content: 0.25,
      ml: 0.3,
      trending: 0.1,
      skillGap: 0.05,
    };

    const algorithmUsed = recommendation.metadata?.algorithmUsed || 'unknown';
    const baseScore = recommendation.confidenceScore || 0.5;
    const weight = weights[algorithmUsed as keyof typeof weights] || 0.1;

    // Apply contextual adjustments
    let adjustedScore = baseScore * weight;

    // Boost recent interactions
    if (context.recentInteractions?.some((i) => i.courseId === recommendation.courseId)) {
      adjustedScore *= 1.2;
    }

    // Boost based on user preferences
    if (
      recommendation.metadata?.tags?.some((tag: string) =>
        context.userProfile?.preferences?.favoriteTopics?.includes(tag),
      )
    ) {
      adjustedScore *= 1.15;
    }

    return Math.min(adjustedScore, 1.0);
  }

  /**
   * Calculate recommendation priority
   */
  private calculatePriority(
    recommendation: Partial<Recommendation>,
    context: RecommendationContext,
  ): number {
    let priority = 1;

    // High priority for skill gaps
    if (recommendation.reason === RecommendationReason.SKILL_GAP) {
      priority += 3;
    }

    // Medium priority for continuation
    if (recommendation.reason === RecommendationReason.CONTINUATION) {
      priority += 2;
    }

    // Boost for high confidence
    if ((recommendation.confidenceScore || 0) > 0.8) {
      priority += 1;
    }

    return priority;
  }

  /**
   * Ensure diversity in recommendation types and topics
   */
  private ensureRecommendationDiversity(
    recommendations: Partial<Recommendation>[],
  ): Partial<Recommendation>[] {
    const diversified: Partial<Recommendation>[] = [];
    const typeCount = new Map<RecommendationType, number>();
    const topicCount = new Map<string, number>();

    for (const rec of recommendations) {
      const type = rec.recommendationType!;
      const topics = rec.metadata?.tags || [];

      // Limit recommendations per type
      const currentTypeCount = typeCount.get(type) || 0;
      if (currentTypeCount >= 3) continue;

      // Limit recommendations per topic
      const hasOverrepresentedTopic = topics.some(
        (topic: string) => (topicCount.get(topic) || 0) >= 2,
      );
      if (hasOverrepresentedTopic) continue;

      diversified.push(rec);
      typeCount.set(type, currentTypeCount + 1);
      topics.forEach((topic: string) => topicCount.set(topic, (topicCount.get(topic) || 0) + 1));
    }

    return diversified;
  }
}
