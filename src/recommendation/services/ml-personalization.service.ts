import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserInteraction, InteractionType } from '../entities/user-interaction.entity';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import {
  Recommendation,
  RecommendationType,
  RecommendationReason,
} from '../entities/recommendation.entity';
import { RecommendationContext } from './recommendation-engine.service';

interface MLFeatures {
  userEmbedding: number[];
  contentEmbedding: number[];
  interactionHistory: Record<string, number>;
  skillVector: number[];
  preferenceVector: number[];
  contextualFeatures: Record<string, number>;
}

interface PersonalizationModel {
  version: string;
  weights: number[][];
  biases: number[];
  featureNames: string[];
  lastTrained: Date;
}

@Injectable()
export class MLPersonalizationService {
  private readonly logger = new Logger(MLPersonalizationService.name);
  private model: PersonalizationModel | null = null;
  private readonly EMBEDDING_SIZE = 64;
  private readonly SKILL_VECTOR_SIZE = 50;
  private readonly PREFERENCE_VECTOR_SIZE = 30;

  constructor(
    @InjectRepository(UserInteraction)
    private interactionRepository: Repository<UserInteraction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {
    this.initializeModel();
  }

  /**
   * Generate personalized recommendations using ML models
   */
  async generatePersonalizedRecommendations(
    context: RecommendationContext,
    options: { limit: number; minConfidence: number },
  ): Promise<Partial<Recommendation>[]> {
    try {
      this.logger.log(`Generating ML-based recommendations for user ${context.userId}`);

      // Extract features for the user
      const userFeatures = await this.extractUserFeatures(context);

      // Get candidate courses
      const candidateCourses = await this.getCandidateCourses(context, options.limit * 3);

      // Score each candidate course
      const scoredRecommendations: Array<{
        course: Course;
        score: number;
        features: MLFeatures;
      }> = [];

      for (const course of candidateCourses) {
        const contentFeatures = await this.extractContentFeatures(course);
        const combinedFeatures = this.combineFeatures(userFeatures, contentFeatures, context);
        const score = await this.predictScore(combinedFeatures);

        if (score >= options.minConfidence) {
          scoredRecommendations.push({
            course,
            score,
            features: combinedFeatures,
          });
        }
      }

      // Sort by score and take top recommendations
      scoredRecommendations.sort((a, b) => b.score - a.score);
      const topRecommendations = scoredRecommendations.slice(0, options.limit);

      // Convert to recommendation format
      return topRecommendations.map(({ course, score, features }) => ({
        userId: context.userId,
        courseId: course.id,
        recommendationType: RecommendationType.CONTENT_BASED,
        reason: this.determineRecommendationReason(features, context),
        confidenceScore: score,
        relevanceScore: score * 0.9, // Slight adjustment for relevance
        priority: this.calculateMLPriority(score, features),
        explanation: this.generateExplanation(course, features, score),
        metadata: {
          algorithmUsed: 'ml_personalization',
          modelVersion: this.model?.version || 'v1.0',
          features: {
            userEmbedding: features.userEmbedding.slice(0, 5), // Store first 5 dimensions
            contentEmbedding: features.contentEmbedding.slice(0, 5),
            topSkills: this.getTopSkillsFromVector(features.skillVector),
            topPreferences: this.getTopPreferencesFromVector(features.preferenceVector),
          },
          mlScore: score,
        },
        mlFeatures: {
          userEmbedding: features.userEmbedding,
          contentEmbedding: features.contentEmbedding,
          interactionHistory: features.interactionHistory,
          skillVector: features.skillVector,
          preferenceVector: features.preferenceVector,
        },
      }));
    } catch (error) {
      this.logger.error('Error generating ML recommendations:', error);
      return [];
    }
  }

  /**
   * Update model with user feedback
   */
  async updateModelWithFeedback(
    userId: string,
    recommendationId: string,
    score: number,
  ): Promise<void> {
    try {
      // Store feedback for batch training
      await this.storeFeedbackForTraining(userId, recommendationId, score);

      // If we have enough feedback, trigger model retraining
      const feedbackCount = await this.getFeedbackCount();
      if (feedbackCount % 1000 === 0) {
        // Retrain every 1000 feedback points
        await this.retrainModel();
      }
    } catch (error) {
      this.logger.error('Error updating model with feedback:', error);
    }
  }

  /**
   * Extract user features for ML model
   */
  private async extractUserFeatures(context: RecommendationContext): Promise<MLFeatures> {
    const { userId, userProfile, recentInteractions } = context;

    // User embedding based on interaction history
    const userEmbedding = await this.generateUserEmbedding(userId, recentInteractions || []);

    // Skill vector based on user's current skills
    const skillVector = this.generateSkillVector(userProfile?.skills || []);

    // Preference vector based on user preferences and behavior
    const preferenceVector = await this.generatePreferenceVector(userId, recentInteractions || []);

    // Interaction history features
    const interactionHistory = this.generateInteractionHistoryFeatures(recentInteractions || []);

    // Contextual features
    const contextualFeatures = this.generateContextualFeatures(context);

    return {
      userEmbedding,
      contentEmbedding: [], // Will be filled when combining with content
      interactionHistory,
      skillVector,
      preferenceVector,
      contextualFeatures,
    };
  }

  /**
   * Extract content features for courses
   */
  private async extractContentFeatures(course: Course): Promise<Partial<MLFeatures>> {
    // Content embedding based on course metadata
    const contentEmbedding = this.generateContentEmbedding(course);

    // Skill vector for course requirements/outcomes
    const skillVector = this.generateSkillVector(course.skills || []);

    return {
      contentEmbedding,
      skillVector,
      interactionHistory: {},
      userEmbedding: [],
      preferenceVector: [],
      contextualFeatures: {},
    };
  }

  /**
   * Combine user and content features
   */
  private combineFeatures(
    userFeatures: MLFeatures,
    contentFeatures: Partial<MLFeatures>,
    context: RecommendationContext,
  ): MLFeatures {
    return {
      userEmbedding: userFeatures.userEmbedding,
      contentEmbedding: contentFeatures.contentEmbedding || [],
      interactionHistory: userFeatures.interactionHistory,
      skillVector: this.combineSkillVectors(
        userFeatures.skillVector,
        contentFeatures.skillVector || [],
      ),
      preferenceVector: userFeatures.preferenceVector,
      contextualFeatures: {
        ...userFeatures.contextualFeatures,
        skillAlignment: this.calculateSkillAlignment(
          userFeatures.skillVector,
          contentFeatures.skillVector || [],
        ),
        contentPopularity: Math.random(), // Placeholder for actual popularity score
        userExperience: this.calculateUserExperience(context),
      },
    };
  }

  /**
   * Predict score using ML model
   */
  private async predictScore(features: MLFeatures): Promise<number> {
    if (!this.model) {
      // Fallback to simple heuristic if model not available
      return this.calculateHeuristicScore(features);
    }

    try {
      // Convert features to input vector
      const inputVector = this.featuresToVector(features);

      // Apply model weights and biases
      let score = 0;
      for (let i = 0; i < inputVector.length; i++) {
        for (let j = 0; j < this.model.weights[i].length; j++) {
          score += inputVector[i] * this.model.weights[i][j];
        }
      }

      // Add bias and apply sigmoid activation
      score += this.model.biases[0];
      score = 1 / (1 + Math.exp(-score));

      return Math.max(0, Math.min(1, score));
    } catch (error) {
      this.logger.error('Error in ML prediction:', error);
      return this.calculateHeuristicScore(features);
    }
  }

  /**
   * Generate user embedding from interaction history
   */
  private async generateUserEmbedding(
    userId: string,
    interactions: UserInteraction[],
  ): Promise<number[]> {
    const embedding = new Array(this.EMBEDDING_SIZE).fill(0);

    // Simple approach: aggregate interaction patterns
    const interactionCounts = new Map<InteractionType, number>();
    const courseCounts = new Map<string, number>();

    interactions.forEach((interaction) => {
      interactionCounts.set(
        interaction.interactionType,
        (interactionCounts.get(interaction.interactionType) || 0) + 1,
      );

      if (interaction.courseId) {
        courseCounts.set(interaction.courseId, (courseCounts.get(interaction.courseId) || 0) + 1);
      }
    });

    // Encode interaction patterns into embedding
    let idx = 0;
    for (const [type, count] of interactionCounts.entries()) {
      if (idx < this.EMBEDDING_SIZE) {
        embedding[idx] = Math.log(count + 1) / 10; // Normalize
        idx++;
      }
    }

    // Add randomness for diversity (in real implementation, this would be learned)
    for (let i = idx; i < this.EMBEDDING_SIZE; i++) {
      embedding[i] = (Math.random() - 0.5) * 0.1;
    }

    return embedding;
  }

  /**
   * Generate content embedding for courses
   */
  private generateContentEmbedding(course: Course): number[] {
    const embedding = new Array(this.EMBEDDING_SIZE).fill(0);

    // Encode course properties
    embedding[0] =
      course.difficulty === 'beginner' ? 0.2 : course.difficulty === 'intermediate' ? 0.5 : 0.8;
    embedding[1] = Math.log((course.duration || 60) + 1) / 10;
    embedding[2] = (course.rating || 0) / 5;
    embedding[3] = course.isPaid ? 1 : 0;

    // Encode tags/categories (simplified)
    const tags = course.tags || [];
    for (let i = 0; i < Math.min(tags.length, 10); i++) {
      embedding[4 + i] = this.hashStringToFloat(tags[i]);
    }

    // Fill remaining with course-specific features
    for (let i = 14; i < this.EMBEDDING_SIZE; i++) {
      embedding[i] = (Math.random() - 0.5) * 0.1;
    }

    return embedding;
  }

  /**
   * Generate skill vector
   */
  private generateSkillVector(skills: string[]): number[] {
    const vector = new Array(this.SKILL_VECTOR_SIZE).fill(0);

    // Map skills to vector positions (simplified)
    skills.forEach((skill) => {
      const index = this.hashStringToIndex(skill, this.SKILL_VECTOR_SIZE);
      vector[index] = Math.min(vector[index] + 0.2, 1.0);
    });

    return vector;
  }

  /**
   * Generate preference vector from user behavior
   */
  private async generatePreferenceVector(
    userId: string,
    interactions: UserInteraction[],
  ): Promise<number[]> {
    const vector = new Array(this.PREFERENCE_VECTOR_SIZE).fill(0);

    // Analyze interaction patterns to infer preferences
    const preferences = new Map<string, number>();

    interactions.forEach((interaction) => {
      const weight = interaction.weightedValue;
      const course = interaction.course;

      if (course?.tags) {
        course.tags.forEach((tag) => {
          preferences.set(tag, (preferences.get(tag) || 0) + weight);
        });
      }
    });

    // Convert preferences to vector
    let idx = 0;
    for (const [preference, score] of preferences.entries()) {
      if (idx < this.PREFERENCE_VECTOR_SIZE) {
        vector[idx] = Math.tanh(score / 10); // Normalize
        idx++;
      }
    }

    return vector;
  }

  /**
   * Generate interaction history features
   */
  private generateInteractionHistoryFeatures(
    interactions: UserInteraction[],
  ): Record<string, number> {
    const features: Record<string, number> = {};

    // Count interactions by type
    Object.values(InteractionType).forEach((type) => {
      features[`${type}_count`] = interactions.filter((i) => i.interactionType === type).length;
    });

    // Time-based features
    const now = new Date();
    features.recent_activity = interactions.filter(
      (i) => now.getTime() - i.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000,
    ).length;

    features.total_interactions = interactions.length;
    features.avg_session_length = this.calculateAverageSessionLength(interactions);
    features.completion_rate = this.calculateCompletionRate(interactions);

    return features;
  }

  /**
   * Generate contextual features
   */
  private generateContextualFeatures(context: RecommendationContext): Record<string, number> {
    const features: Record<string, number> = {};

    features.time_of_day = new Date().getHours() / 24;
    features.day_of_week = new Date().getDay() / 7;
    features.is_mobile = context.deviceType === 'mobile' ? 1 : 0;
    features.session_length = Math.random(); // Placeholder

    return features;
  }

  /**
   * Get candidate courses for recommendation
   */
  private async getCandidateCourses(
    context: RecommendationContext,
    limit: number,
  ): Promise<Course[]> {
    // Get courses user hasn't interacted with recently
    const recentCourseIds =
      context.recentInteractions?.filter((i) => i.courseId).map((i) => i.courseId) || [];

    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .where('course.isActive = :isActive', { isActive: true });

    if (recentCourseIds.length > 0) {
      queryBuilder.andWhere('course.id NOT IN (:...recentCourseIds)', { recentCourseIds });
    }

    return queryBuilder.orderBy('RANDOM()').take(limit).getMany();
  }

  /**
   * Initialize ML model
   */
  private initializeModel(): void {
    // In a real implementation, this would load a trained model
    // For now, we'll use a simple placeholder model
    this.model = {
      version: 'v1.0',
      weights: Array(100)
        .fill(0)
        .map(() =>
          Array(10)
            .fill(0)
            .map(() => Math.random() - 0.5),
        ),
      biases: Array(10)
        .fill(0)
        .map(() => Math.random() - 0.5),
      featureNames: ['user_embedding', 'content_embedding', 'skill_alignment', 'preference_match'],
      lastTrained: new Date(),
    };
  }

  /**
   * Convert features to input vector for ML model
   */
  private featuresToVector(features: MLFeatures): number[] {
    const vector: number[] = [];

    // Add user embedding (first 10 dimensions)
    vector.push(...features.userEmbedding.slice(0, 10));

    // Add content embedding (first 10 dimensions)
    vector.push(...features.contentEmbedding.slice(0, 10));

    // Add skill vector (first 10 dimensions)
    vector.push(...features.skillVector.slice(0, 10));

    // Add preference vector (first 10 dimensions)
    vector.push(...features.preferenceVector.slice(0, 10));

    // Add contextual features
    const contextValues = Object.values(features.contextualFeatures);
    vector.push(...contextValues.slice(0, 10));

    // Pad to fixed size
    while (vector.length < 50) {
      vector.push(0);
    }

    return vector.slice(0, 50);
  }

  /**
   * Calculate heuristic score as fallback
   */
  private calculateHeuristicScore(features: MLFeatures): number {
    let score = 0.5; // Base score

    // Skill alignment boost
    const skillAlignment = features.contextualFeatures.skillAlignment || 0;
    score += skillAlignment * 0.3;

    // User experience factor
    const userExperience = features.contextualFeatures.userExperience || 0.5;
    score += (userExperience - 0.5) * 0.2;

    // Content popularity
    const popularity = features.contextualFeatures.contentPopularity || 0.5;
    score += popularity * 0.1;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Utility functions
   */
  private hashStringToFloat(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to [0, 1]
  }

  private hashStringToIndex(str: string, maxIndex: number): number {
    return Math.floor(this.hashStringToFloat(str) * maxIndex);
  }

  private combineSkillVectors(userSkills: number[], contentSkills: number[]): number[] {
    const combined = new Array(Math.max(userSkills.length, contentSkills.length)).fill(0);

    for (let i = 0; i < combined.length; i++) {
      const userVal = userSkills[i] || 0;
      const contentVal = contentSkills[i] || 0;
      combined[i] = (userVal + contentVal) / 2;
    }

    return combined;
  }

  private calculateSkillAlignment(userSkills: number[], contentSkills: number[]): number {
    if (userSkills.length === 0 || contentSkills.length === 0) return 0;

    let dotProduct = 0;
    let userNorm = 0;
    let contentNorm = 0;

    const minLength = Math.min(userSkills.length, contentSkills.length);

    for (let i = 0; i < minLength; i++) {
      dotProduct += userSkills[i] * contentSkills[i];
      userNorm += userSkills[i] * userSkills[i];
      contentNorm += contentSkills[i] * contentSkills[i];
    }

    if (userNorm === 0 || contentNorm === 0) return 0;

    return dotProduct / (Math.sqrt(userNorm) * Math.sqrt(contentNorm));
  }

  private calculateUserExperience(context: RecommendationContext): number {
    const interactions = context.recentInteractions || [];
    if (interactions.length === 0) return 0.1; // New user

    const completions = interactions.filter(
      (i) => i.interactionType === InteractionType.COMPLETE,
    ).length;
    const enrollments = interactions.filter(
      (i) => i.interactionType === InteractionType.ENROLL,
    ).length;

    if (enrollments === 0) return 0.3;

    const completionRate = completions / enrollments;
    return Math.min(0.9, 0.3 + completionRate * 0.6);
  }

  private calculateAverageSessionLength(interactions: UserInteraction[]): number {
    const sessions = new Map<string, UserInteraction[]>();

    interactions.forEach((interaction) => {
      const sessionId = interaction.sessionId || 'default';
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, []);
      }
      sessions.get(sessionId)!.push(interaction);
    });

    let totalLength = 0;
    let sessionCount = 0;

    for (const sessionInteractions of sessions.values()) {
      if (sessionInteractions.length > 1) {
        const start = Math.min(...sessionInteractions.map((i) => i.createdAt.getTime()));
        const end = Math.max(...sessionInteractions.map((i) => i.createdAt.getTime()));
        totalLength += (end - start) / 1000 / 60; // Convert to minutes
        sessionCount++;
      }
    }

    return sessionCount > 0 ? totalLength / sessionCount : 5; // Default 5 minutes
  }

  private calculateCompletionRate(interactions: UserInteraction[]): number {
    const enrollments = interactions.filter(
      (i) => i.interactionType === InteractionType.ENROLL,
    ).length;
    const completions = interactions.filter(
      (i) => i.interactionType === InteractionType.COMPLETE,
    ).length;

    return enrollments > 0 ? completions / enrollments : 0;
  }

  private determineRecommendationReason(
    features: MLFeatures,
    context: RecommendationContext,
  ): RecommendationReason {
    const skillAlignment = features.contextualFeatures.skillAlignment || 0;

    if (skillAlignment > 0.7) {
      return RecommendationReason.SKILL_GAP;
    } else if (context.recentInteractions?.length && context.recentInteractions.length > 10) {
      return RecommendationReason.LEARNING_HISTORY;
    } else {
      return RecommendationReason.INTEREST_BASED;
    }
  }

  private calculateMLPriority(score: number, features: MLFeatures): number {
    let priority = Math.floor(score * 5); // Base priority from score

    // Boost for high skill alignment
    if ((features.contextualFeatures.skillAlignment || 0) > 0.8) {
      priority += 2;
    }

    return Math.min(priority, 10);
  }

  private generateExplanation(course: Course, features: MLFeatures, score: number): string {
    const skillAlignment = features.contextualFeatures.skillAlignment || 0;

    if (skillAlignment > 0.7) {
      return `This course aligns well with your skill development goals`;
    } else if (score > 0.8) {
      return `Highly recommended based on your learning patterns`;
    } else {
      return `Recommended based on your interests and activity`;
    }
  }

  private getTopSkillsFromVector(skillVector: number[]): string[] {
    // This would map vector indices back to skill names in a real implementation
    return ['JavaScript', 'React', 'Node.js'].slice(0, 3);
  }

  private getTopPreferencesFromVector(preferenceVector: number[]): string[] {
    // This would map vector indices back to preference names in a real implementation
    return ['Web Development', 'Frontend', 'Backend'].slice(0, 3);
  }

  private async storeFeedbackForTraining(
    userId: string,
    recommendationId: string,
    score: number,
  ): Promise<void> {
    // Store feedback in a training data table (implementation would depend on your setup)
    this.logger.log(`Storing feedback: user=${userId}, rec=${recommendationId}, score=${score}`);
  }

  private async getFeedbackCount(): Promise<number> {
    // Return count of feedback records for retraining decision
    return Math.floor(Math.random() * 2000); // Placeholder
  }

  private async retrainModel(): Promise<void> {
    this.logger.log('Triggering model retraining...');
    // In a real implementation, this would trigger an ML pipeline
    // For now, just update the model timestamp
    if (this.model) {
      this.model.lastTrained = new Date();
    }
  }
}
