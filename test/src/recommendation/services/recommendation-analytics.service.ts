import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecommendationAnalytics, AnalyticsEventType } from '../entities/recommendation-analytics.entity';
import { RecommendationMetrics } from '../entities/recommendation-analytics.entity';
import { Recommendation } from '../entities/recommendation.entity';

interface RecommendationGenerationEvent {
  userId: string;
  recommendationIds: string[];
  algorithmVersion: string;
  generationTimeMs: number;
  context?: any;
}

interface RecommendationInteractionEvent {
  recommendationId: string;
  userId: string;
  interactionType: string;
  metadata?: any;
}

interface RecommendationFeedbackEvent {
  recommendationId: string;
  userId: string;
  score: number;
  feedbackType: string;
  comment?: string;
}

interface AnalyticsQuery {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  algorithmVersion?: string;
  eventType?: AnalyticsEventType;
  limit?: number;
  offset?: number;
}

interface RecommendationMetricsReport {
  totalRecommendations: number;
  totalInteractions: number;
  clickThroughRate: number;
  conversionRate: number;
  averageRating: number;
  algorithmPerformance: Record<string, {
    count: number;
    ctr: number;
    avgRating: number;
    avgGenerationTime: number;
  }>;
  topPerformingReasons: Array<{
    reason: string;
    count: number;
    ctr: number;
    avgRating: number;
  }>;
  userEngagement: {
    activeUsers: number;
    avgRecommendationsPerUser: number;
    avgInteractionsPerUser: number;
  };
}

@Injectable()
export class RecommendationAnalyticsService {
  private readonly logger = new Logger(RecommendationAnalyticsService.name);

  constructor(
    @InjectRepository(RecommendationAnalytics)
    private analyticsRepository: Repository<RecommendationAnalytics>,
    @InjectRepository(RecommendationMetrics)
    private metricsRepository: Repository<RecommendationMetrics>,
    @InjectRepository(Recommendation)
    private recommendationRepository: Repository<Recommendation>,
  ) {}

  /**
   * Track recommendation generation event
   */
  async trackRecommendationGeneration(event: RecommendationGenerationEvent): Promise<void> {
    try {
      const analytics = new RecommendationAnalytics();
      analytics.userId = event.userId;
      analytics.eventType = AnalyticsEventType.RECOMMENDATION_GENERATED;
      analytics.metadata = {
        recommendationIds: event.recommendationIds,
        algorithmVersion: event.algorithmVersion,
        generationTimeMs: event.generationTimeMs,
        context: event.context,
        count: event.recommendationIds.length,
      };

      await this.analyticsRepository.save(analytics);

      // Update metrics
      await this.updateGenerationMetrics(event);

      this.logger.log(`Tracked recommendation generation for user ${event.userId}: ${event.recommendationIds.length} recommendations`);

    } catch (error) {
      this.logger.error('Error tracking recommendation generation:', error);
    }
  }

  /**
   * Track recommendation interaction event
   */
  async trackRecommendationInteraction(event: RecommendationInteractionEvent): Promise<void> {
    try {
      const analytics = new RecommendationAnalytics();
      analytics.userId = event.userId;
      analytics.recommendationId = event.recommendationId;
      analytics.eventType = this.mapInteractionTypeToEventType(event.interactionType);
      analytics.metadata = {
        interactionType: event.interactionType,
        ...event.metadata,
      };

      await this.analyticsRepository.save(analytics);

      // Update metrics
      await this.updateInteractionMetrics(event);

      this.logger.log(`Tracked recommendation interaction: ${event.interactionType} for recommendation ${event.recommendationId}`);

    } catch (error) {
      this.logger.error('Error tracking recommendation interaction:', error);
    }
  }

  /**
   * Track recommendation feedback event
   */
  async trackRecommendationFeedback(event: RecommendationFeedbackEvent): Promise<void> {
    try {
      const analytics = new RecommendationAnalytics();
      analytics.userId = event.userId;
      analytics.recommendationId = event.recommendationId;
      analytics.eventType = AnalyticsEventType.FEEDBACK_PROVIDED;
      analytics.metadata = {
        score: event.score,
        feedbackType: event.feedbackType,
        comment: event.comment,
      };

      await this.analyticsRepository.save(analytics);

      // Update metrics
      await this.updateFeedbackMetrics(event);

      this.logger.log(`Tracked recommendation feedback: score ${event.score} for recommendation ${event.recommendationId}`);

    } catch (error) {
      this.logger.error('Error tracking recommendation feedback:', error);
    }
  }

  /**
   * Get analytics data based on query parameters
   */
  async getAnalytics(query: AnalyticsQuery): Promise<RecommendationAnalytics[]> {
    const queryBuilder = this.analyticsRepository.createQueryBuilder('analytics');

    if (query.startDate) {
      queryBuilder.andWhere('analytics.createdAt >= :startDate', { startDate: query.startDate });
    }

    if (query.endDate) {
      queryBuilder.andWhere('analytics.createdAt <= :endDate', { endDate: query.endDate });
    }

    if (query.userId) {
      queryBuilder.andWhere('analytics.userId = :userId', { userId: query.userId });
    }

    if (query.eventType) {
      queryBuilder.andWhere('analytics.eventType = :eventType', { eventType: query.eventType });
    }

    if (query.algorithmVersion) {
      queryBuilder.andWhere('analytics.metadata ->> \'algorithmVersion\' = :algorithmVersion', {
        algorithmVersion: query.algorithmVersion,
      });
    }

    queryBuilder.orderBy('analytics.createdAt', 'DESC');

    if (query.limit) {
      queryBuilder.take(query.limit);
    }

    if (query.offset) {
      queryBuilder.skip(query.offset);
    }

    return await queryBuilder.getMany();
  }

  /**
   * Generate comprehensive metrics report
   */
  async generateMetricsReport(startDate: Date, endDate: Date): Promise<RecommendationMetricsReport> {
    try {
      // Get basic counts
      const totalRecommendations = await this.analyticsRepository.count({
        where: {
          eventType: AnalyticsEventType.RECOMMENDATION_GENERATED,
          createdAt: { $gte: startDate, $lte: endDate } as any,
        },
      });

      const totalInteractions = await this.analyticsRepository.count({
        where: {
          eventType: AnalyticsEventType.RECOMMENDATION_CLICKED,
          createdAt: { $gte: startDate, $lte: endDate } as any,
        },
      });

      // Calculate click-through rate
      const clickThroughRate = totalRecommendations > 0 ? totalInteractions / totalRecommendations : 0;

      // Get conversion data (enrollments from recommendations)
      const conversions = await this.analyticsRepository.count({
        where: {
          eventType: AnalyticsEventType.RECOMMENDATION_CONVERTED,
          createdAt: { $gte: startDate, $lte: endDate } as any,
        },
      });

      const conversionRate = totalInteractions > 0 ? conversions / totalInteractions : 0;

      // Calculate average rating from feedback
      const feedbackData = await this.analyticsRepository
        .createQueryBuilder('analytics')
        .select('AVG(CAST(analytics.metadata ->> \'score\' AS FLOAT))', 'avgRating')
        .where('analytics.eventType = :eventType', { eventType: AnalyticsEventType.FEEDBACK_PROVIDED })
        .andWhere('analytics.createdAt >= :startDate', { startDate })
        .andWhere('analytics.createdAt <= :endDate', { endDate })
        .getRawOne();

      const averageRating = parseFloat(feedbackData?.avgRating || '0');

      // Algorithm performance analysis
      const algorithmPerformance = await this.getAlgorithmPerformance(startDate, endDate);

      // Top performing reasons
      const topPerformingReasons = await this.getTopPerformingReasons(startDate, endDate);

      // User engagement metrics
      const userEngagement = await this.getUserEngagementMetrics(startDate, endDate);

      return {
        totalRecommendations,
        totalInteractions,
        clickThroughRate,
        conversionRate,
        averageRating,
        algorithmPerformance,
        topPerformingReasons,
        userEngagement,
      };

    } catch (error) {
      this.logger.error('Error generating metrics report:', error);
      throw error;
    }
  }

  /**
   * Get real-time metrics for dashboard
   */
  async getRealTimeMetrics(): Promise<{
    last24Hours: Partial<RecommendationMetricsReport>;
    last7Days: Partial<RecommendationMetricsReport>;
    last30Days: Partial<RecommendationMetricsReport>;
  }> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [metrics24h, metrics7d, metrics30d] = await Promise.all([
      this.generateMetricsReport(last24Hours, now),
      this.generateMetricsReport(last7Days, now),
      this.generateMetricsReport(last30Days, now),
    ]);

    return {
      last24Hours: metrics24h,
      last7Days: metrics7d,
      last30Days: metrics30d,
    };
  }

  /**
   * Get user-specific analytics
   */
  async getUserAnalytics(userId: string, days: number = 30): Promise<{
    totalRecommendationsReceived: number;
    totalInteractions: number;
    averageFeedbackScore: number;
    topRecommendationReasons: string[];
    engagementTrend: Array<{ date: string; interactions: number }>;
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    // Get user-specific analytics
    const userAnalytics = await this.getAnalytics({
      userId,
      startDate,
      endDate,
    });

    const totalRecommendationsReceived = userAnalytics.filter(
      a => a.eventType === AnalyticsEventType.RECOMMENDATION_GENERATED
    ).length;

    const totalInteractions = userAnalytics.filter(
      a => a.eventType === AnalyticsEventType.RECOMMENDATION_CLICKED
    ).length;

    // Calculate average feedback score
    const feedbackEvents = userAnalytics.filter(
      a => a.eventType === AnalyticsEventType.FEEDBACK_PROVIDED
    );
    
    const averageFeedbackScore = feedbackEvents.length > 0
      ? feedbackEvents.reduce((sum, event) => sum + (event.metadata?.score || 0), 0) / feedbackEvents.length
      : 0;

    // Get top recommendation reasons from user's recommendations
    const recommendations = await this.recommendationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    const reasonCounts = new Map<string, number>();
    recommendations.forEach(rec => {
      const reason = rec.reason;
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    });

    const topRecommendationReasons = Array.from(reasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason]) => reason);

    // Generate engagement trend (daily interactions over the period)
    const engagementTrend = await this.generateEngagementTrend(userId, startDate, endDate);

    return {
      totalRecommendationsReceived,
      totalInteractions,
      averageFeedbackScore,
      topRecommendationReasons,
      engagementTrend,
    };
  }

  /**
   * Update generation metrics
   */
  private async updateGenerationMetrics(event: RecommendationGenerationEvent): Promise<void> {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    let metrics = await this.metricsRepository.findOne({
      where: { date, algorithmVersion: event.algorithmVersion },
    });

    if (!metrics) {
      metrics = new RecommendationMetrics();
      metrics.date = date;
      metrics.algorithmVersion = event.algorithmVersion;
      metrics.totalRecommendations = 0;
      metrics.totalClicks = 0;
      metrics.totalConversions = 0;
      metrics.totalFeedback = 0;
      metrics.averageRating = 0;
      metrics.averageGenerationTime = 0;
    }

    metrics.totalRecommendations += event.recommendationIds.length;
    
    // Update average generation time
    const currentAvg = metrics.averageGenerationTime || 0;
    const currentCount = metrics.totalRecommendations - event.recommendationIds.length;
    const newAvg = currentCount > 0 
      ? (currentAvg * currentCount + event.generationTimeMs) / metrics.totalRecommendations
      : event.generationTimeMs;
    
    metrics.averageGenerationTime = newAvg;

    await this.metricsRepository.save(metrics);
  }

  /**
   * Update interaction metrics
   */
  private async updateInteractionMetrics(event: RecommendationInteractionEvent): Promise<void> {
    // Get recommendation to find algorithm version
    const recommendation = await this.recommendationRepository.findOne({
      where: { id: event.recommendationId },
    });

    if (!recommendation) return;

    const algorithmVersion = recommendation.metadata?.algorithmUsed || 'unknown';
    const date = new Date().toISOString().split('T')[0];
    
    let metrics = await this.metricsRepository.findOne({
      where: { date, algorithmVersion },
    });

    if (!metrics) {
      metrics = new RecommendationMetrics();
      metrics.date = date;
      metrics.algorithmVersion = algorithmVersion;
      metrics.totalRecommendations = 0;
      metrics.totalClicks = 0;
      metrics.totalConversions = 0;
      metrics.totalFeedback = 0;
      metrics.averageRating = 0;
      metrics.averageGenerationTime = 0;
    }

    if (event.interactionType === 'click') {
      metrics.totalClicks += 1;
    } else if (event.interactionType === 'enroll' || event.interactionType === 'start') {
      metrics.totalConversions += 1;
    }

    await this.metricsRepository.save(metrics);
  }

  /**
   * Update feedback metrics
   */
  private async updateFeedbackMetrics(event: RecommendationFeedbackEvent): Promise<void> {
    // Get recommendation to find algorithm version
    const recommendation = await this.recommendationRepository.findOne({
      where: { id: event.recommendationId },
    });

    if (!recommendation) return;

    const algorithmVersion = recommendation.metadata?.algorithmUsed || 'unknown';
    const date = new Date().toISOString().split('T')[0];
    
    let metrics = await this.metricsRepository.findOne({
      where: { date, algorithmVersion },
    });

    if (!metrics) {
      metrics = new RecommendationMetrics();
      metrics.date = date;
      metrics.algorithmVersion = algorithmVersion;
      metrics.totalRecommendations = 0;
      metrics.totalClicks = 0;
      metrics.totalConversions = 0;
      metrics.totalFeedback = 0;
      metrics.averageRating = 0;
      metrics.averageGenerationTime = 0;
    }

    // Update average rating
    const currentAvg = metrics.averageRating || 0;
    const currentCount = metrics.totalFeedback;
    const newAvg = currentCount > 0 
      ? (currentAvg * currentCount + event.score) / (currentCount + 1)
      : event.score;
    
    metrics.averageRating = newAvg;
    metrics.totalFeedback += 1;

    await this.metricsRepository.save(metrics);
  }

  /**
   * Map interaction type to analytics event type
   */
  private mapInteractionTypeToEventType(interactionType: string): AnalyticsEventType {
    const mapping = {
      'view': AnalyticsEventType.RECOMMENDATION_VIEWED,
      'click': AnalyticsEventType.RECOMMENDATION_CLICKED,
      'dismiss': AnalyticsEventType.RECOMMENDATION_DISMISSED,
      'enroll': AnalyticsEventType.RECOMMENDATION_CONVERTED,
      'start': AnalyticsEventType.RECOMMENDATION_CONVERTED,
    };

    return mapping[interactionType as keyof typeof mapping] || AnalyticsEventType.RECOMMENDATION_VIEWED;
  }

  /**
   * Get algorithm performance metrics
   */
  private async getAlgorithmPerformance(startDate: Date, endDate: Date): Promise<Record<string, any>> {
    const metrics = await this.metricsRepository
      .createQueryBuilder('metrics')
      .where('metrics.date >= :startDate', { startDate: startDate.toISOString().split('T')[0] })
      .andWhere('metrics.date <= :endDate', { endDate: endDate.toISOString().split('T')[0] })
      .getMany();

    const performance: Record<string, any> = {};

    metrics.forEach(metric => {
      const algorithm = metric.algorithmVersion;
      
      if (!performance[algorithm]) {
        performance[algorithm] = {
          count: 0,
          ctr: 0,
          avgRating: 0,
          avgGenerationTime: 0,
        };
      }

      performance[algorithm].count += metric.totalRecommendations;
      performance[algorithm].ctr = metric.totalRecommendations > 0 
        ? metric.totalClicks / metric.totalRecommendations 
        : 0;
      performance[algorithm].avgRating = metric.averageRating;
      performance[algorithm].avgGenerationTime = metric.averageGenerationTime;
    });

    return performance;
  }

  /**
   * Get top performing recommendation reasons
   */
  private async getTopPerformingReasons(startDate: Date, endDate: Date): Promise<Array<any>> {
    // This would require analyzing recommendations and their performance
    // For now, return a placeholder implementation
    return [
      { reason: 'SKILL_GAP', count: 150, ctr: 0.25, avgRating: 4.2 },
      { reason: 'SIMILAR_CONTENT', count: 120, ctr: 0.22, avgRating: 4.0 },
      { reason: 'TRENDING', count: 100, ctr: 0.18, avgRating: 3.8 },
    ];
  }

  /**
   * Get user engagement metrics
   */
  private async getUserEngagementMetrics(startDate: Date, endDate: Date): Promise<any> {
    const activeUsers = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('COUNT(DISTINCT analytics.userId)', 'count')
      .where('analytics.createdAt >= :startDate', { startDate })
      .andWhere('analytics.createdAt <= :endDate', { endDate })
      .getRawOne();

    const avgRecommendations = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('AVG(CAST(analytics.metadata ->> \'count\' AS INTEGER))', 'avg')
      .where('analytics.eventType = :eventType', { eventType: AnalyticsEventType.RECOMMENDATION_GENERATED })
      .andWhere('analytics.createdAt >= :startDate', { startDate })
      .andWhere('analytics.createdAt <= :endDate', { endDate })
      .getRawOne();

    const totalInteractions = await this.analyticsRepository.count({
      where: {
        eventType: AnalyticsEventType.RECOMMENDATION_CLICKED,
        createdAt: { $gte: startDate, $lte: endDate } as any,
      },
    });

    return {
      activeUsers: parseInt(activeUsers?.count || '0'),
      avgRecommendationsPerUser: parseFloat(avgRecommendations?.avg || '0'),
      avgInteractionsPerUser: parseInt(activeUsers?.count || '0') > 0 
        ? totalInteractions / parseInt(activeUsers.count)
        : 0,
    };
  }

  /**
   * Generate engagement trend for a user
   */
  private async generateEngagementTrend(userId: string, startDate: Date, endDate: Date): Promise<Array<any>> {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const trend = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const interactions = await this.analyticsRepository.count({
        where: {
          userId,
          eventType: AnalyticsEventType.RECOMMENDATION_CLICKED,
          createdAt: { $gte: date, $lt: nextDate } as any,
        },
      });

      trend.push({
        date: date.toISOString().split('T')[0],
        interactions,
      });
    }

    return trend;
  }
}
