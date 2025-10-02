import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../../courses/entities/course.entity';
import { UserInteraction, InteractionType } from '../entities/user-interaction.entity';
import {
  Recommendation,
  RecommendationType,
  RecommendationReason,
} from '../entities/recommendation.entity';
import { RecommendationContext } from './recommendation-engine.service';

interface ContentFeatures {
  tags: string[];
  skills: string[];
  difficulty: string;
  duration: number;
  category: string;
  instructor: string;
  rating: number;
  topics: string[];
}

interface SimilarityScore {
  courseId: string;
  score: number;
  reasons: string[];
  features: ContentFeatures;
}

@Injectable()
export class ContentSimilarityService {
  private readonly logger = new Logger(ContentSimilarityService.name);

  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(UserInteraction)
    private interactionRepository: Repository<UserInteraction>,
  ) {}

  /**
   * Generate content-based recommendations using similarity algorithms
   */
  async generateContentBasedRecommendations(
    context: RecommendationContext,
    options: { limit: number; minConfidence: number },
  ): Promise<Partial<Recommendation>[]> {
    try {
      this.logger.log(`Generating content-based recommendations for user ${context.userId}`);

      // Get user's interaction history to understand preferences
      const userPreferences = await this.extractUserPreferences(context);

      // Get candidate courses
      const candidateCourses = await this.getCandidateCourses(context, options.limit * 4);

      // Calculate similarity scores
      const similarityScores = await this.calculateSimilarityScores(
        candidateCourses,
        userPreferences,
      );

      // Filter by minimum confidence and sort
      const filteredScores = similarityScores
        .filter((score) => score.score >= options.minConfidence)
        .sort((a, b) => b.score - a.score)
        .slice(0, options.limit);

      // Convert to recommendations
      return filteredScores.map((score) => this.createRecommendation(score, context));
    } catch (error) {
      this.logger.error('Error generating content-based recommendations:', error);
      return [];
    }
  }

  /**
   * Find similar courses to a given course
   */
  async findSimilarCourses(courseId: string, limit: number = 10): Promise<Course[]> {
    const targetCourse = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!targetCourse) {
      throw new Error(`Course ${courseId} not found`);
    }

    const targetFeatures = this.extractCourseFeatures(targetCourse);
    const allCourses = await this.courseRepository.find({
      where: { isActive: true },
    });

    const similarities = allCourses
      .filter((course) => course.id !== courseId)
      .map((course) => ({
        course,
        similarity: this.calculateCourseSimilarity(
          targetFeatures,
          this.extractCourseFeatures(course),
        ),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarities.map((s) => s.course);
  }

  /**
   * Extract user preferences from interaction history
   */
  private async extractUserPreferences(context: RecommendationContext): Promise<{
    preferredTags: Map<string, number>;
    preferredSkills: Map<string, number>;
    preferredDifficulty: Map<string, number>;
    preferredCategories: Map<string, number>;
    preferredInstructors: Map<string, number>;
    avgDuration: number;
    avgRating: number;
  }> {
    const interactions = context.recentInteractions || [];

    const preferences = {
      preferredTags: new Map<string, number>(),
      preferredSkills: new Map<string, number>(),
      preferredDifficulty: new Map<string, number>(),
      preferredCategories: new Map<string, number>(),
      preferredInstructors: new Map<string, number>(),
      avgDuration: 0,
      avgRating: 0,
    };

    let totalDuration = 0;
    let totalRating = 0;
    let courseCount = 0;

    // Analyze interactions to build preference profile
    for (const interaction of interactions) {
      const course = interaction.course;
      if (!course) continue;

      const weight = this.getInteractionWeight(interaction);

      // Tags preferences
      if (course.tags) {
        course.tags.forEach((tag) => {
          preferences.preferredTags.set(tag, (preferences.preferredTags.get(tag) || 0) + weight);
        });
      }

      // Skills preferences
      if (course.skills) {
        course.skills.forEach((skill) => {
          preferences.preferredSkills.set(
            skill,
            (preferences.preferredSkills.get(skill) || 0) + weight,
          );
        });
      }

      // Difficulty preferences
      if (course.difficulty) {
        preferences.preferredDifficulty.set(
          course.difficulty,
          (preferences.preferredDifficulty.get(course.difficulty) || 0) + weight,
        );
      }

      // Category preferences
      if (course.category) {
        preferences.preferredCategories.set(
          course.category,
          (preferences.preferredCategories.get(course.category) || 0) + weight,
        );
      }

      // Instructor preferences
      if (course.instructor) {
        preferences.preferredInstructors.set(
          course.instructor,
          (preferences.preferredInstructors.get(course.instructor) || 0) + weight,
        );
      }

      // Duration and rating averages
      if (course.duration) {
        totalDuration += course.duration * weight;
      }
      if (course.rating) {
        totalRating += course.rating * weight;
      }
      courseCount += weight;
    }

    // Calculate averages
    if (courseCount > 0) {
      preferences.avgDuration = totalDuration / courseCount;
      preferences.avgRating = totalRating / courseCount;
    }

    return preferences;
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

    return weights[interaction.interactionType] || 0.1;
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

    // Prioritize highly rated courses
    queryBuilder.orderBy('course.rating', 'DESC');

    return queryBuilder.take(limit).getMany();
  }

  /**
   * Calculate similarity scores for candidate courses
   */
  private async calculateSimilarityScores(
    courses: Course[],
    userPreferences: any,
  ): Promise<SimilarityScore[]> {
    return courses.map((course) => {
      const features = this.extractCourseFeatures(course);
      const score = this.calculateContentSimilarity(features, userPreferences);
      const reasons = this.generateSimilarityReasons(features, userPreferences, score);

      return {
        courseId: course.id,
        score,
        reasons,
        features,
      };
    });
  }

  /**
   * Extract features from a course
   */
  private extractCourseFeatures(course: Course): ContentFeatures {
    return {
      tags: course.tags || [],
      skills: course.skills || [],
      difficulty: course.difficulty || 'beginner',
      duration: course.duration || 0,
      category: course.category || 'general',
      instructor: course.instructor || 'unknown',
      rating: course.rating || 0,
      topics: course.topics || [],
    };
  }

  /**
   * Calculate content similarity score
   */
  private calculateContentSimilarity(
    courseFeatures: ContentFeatures,
    userPreferences: any,
  ): number {
    let totalScore = 0;
    let totalWeight = 0;

    // Tags similarity (weight: 0.25)
    const tagScore = this.calculateFeatureSimilarity(
      courseFeatures.tags,
      userPreferences.preferredTags,
    );
    totalScore += tagScore * 0.25;
    totalWeight += 0.25;

    // Skills similarity (weight: 0.3)
    const skillScore = this.calculateFeatureSimilarity(
      courseFeatures.skills,
      userPreferences.preferredSkills,
    );
    totalScore += skillScore * 0.3;
    totalWeight += 0.3;

    // Category similarity (weight: 0.15)
    const categoryScore = userPreferences.preferredCategories.has(courseFeatures.category)
      ? userPreferences.preferredCategories.get(courseFeatures.category) / 10
      : 0;
    totalScore += Math.min(categoryScore, 1) * 0.15;
    totalWeight += 0.15;

    // Difficulty similarity (weight: 0.1)
    const difficultyScore = userPreferences.preferredDifficulty.has(courseFeatures.difficulty)
      ? userPreferences.preferredDifficulty.get(courseFeatures.difficulty) / 10
      : 0.5; // Neutral if no preference
    totalScore += Math.min(difficultyScore, 1) * 0.1;
    totalWeight += 0.1;

    // Duration similarity (weight: 0.1)
    const durationScore = this.calculateDurationSimilarity(
      courseFeatures.duration,
      userPreferences.avgDuration,
    );
    totalScore += durationScore * 0.1;
    totalWeight += 0.1;

    // Rating boost (weight: 0.1)
    const ratingScore = courseFeatures.rating / 5;
    totalScore += ratingScore * 0.1;
    totalWeight += 0.1;

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Calculate similarity for list features (tags, skills, topics)
   */
  private calculateFeatureSimilarity(
    courseFeatures: string[],
    userPreferences: Map<string, number>,
  ): number {
    if (courseFeatures.length === 0 || userPreferences.size === 0) {
      return 0;
    }

    let totalScore = 0;
    let maxPossibleScore = 0;

    courseFeatures.forEach((feature) => {
      const preferenceScore = userPreferences.get(feature) || 0;
      totalScore += Math.min(preferenceScore / 10, 1); // Normalize to [0, 1]
      maxPossibleScore += 1;
    });

    return maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
  }

  /**
   * Calculate duration similarity
   */
  private calculateDurationSimilarity(
    courseDuration: number,
    avgPreferredDuration: number,
  ): number {
    if (avgPreferredDuration === 0) return 0.5; // Neutral if no preference

    const ratio =
      Math.min(courseDuration, avgPreferredDuration) /
      Math.max(courseDuration, avgPreferredDuration);
    return ratio;
  }

  /**
   * Calculate similarity between two courses
   */
  private calculateCourseSimilarity(
    features1: ContentFeatures,
    features2: ContentFeatures,
  ): number {
    let totalScore = 0;
    let weights = 0;

    // Tags similarity
    const tagSimilarity = this.calculateJaccardSimilarity(features1.tags, features2.tags);
    totalScore += tagSimilarity * 0.3;
    weights += 0.3;

    // Skills similarity
    const skillSimilarity = this.calculateJaccardSimilarity(features1.skills, features2.skills);
    totalScore += skillSimilarity * 0.3;
    weights += 0.3;

    // Category similarity
    const categorySimilarity = features1.category === features2.category ? 1 : 0;
    totalScore += categorySimilarity * 0.2;
    weights += 0.2;

    // Difficulty similarity
    const difficultySimilarity = features1.difficulty === features2.difficulty ? 1 : 0.5;
    totalScore += difficultySimilarity * 0.1;
    weights += 0.1;

    // Duration similarity
    const durationSimilarity = this.calculateDurationSimilarity(
      features1.duration,
      features2.duration,
    );
    totalScore += durationSimilarity * 0.1;
    weights += 0.1;

    return weights > 0 ? totalScore / weights : 0;
  }

  /**
   * Calculate Jaccard similarity for string arrays
   */
  private calculateJaccardSimilarity(array1: string[], array2: string[]): number {
    if (array1.length === 0 && array2.length === 0) return 1;
    if (array1.length === 0 || array2.length === 0) return 0;

    const set1 = new Set(array1.map((s) => s.toLowerCase()));
    const set2 = new Set(array2.map((s) => s.toLowerCase()));

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Generate reasons for similarity score
   */
  private generateSimilarityReasons(
    features: ContentFeatures,
    userPreferences: any,
    score: number,
  ): string[] {
    const reasons: string[] = [];

    // Check for strong tag matches
    const strongTagMatches = features.tags.filter(
      (tag) => (userPreferences.preferredTags.get(tag) || 0) > 5,
    );
    if (strongTagMatches.length > 0) {
      reasons.push(`Matches your interest in ${strongTagMatches.slice(0, 2).join(', ')}`);
    }

    // Check for skill matches
    const skillMatches = features.skills.filter(
      (skill) => (userPreferences.preferredSkills.get(skill) || 0) > 3,
    );
    if (skillMatches.length > 0) {
      reasons.push(`Builds on your ${skillMatches.slice(0, 2).join(', ')} skills`);
    }

    // Check for category preference
    if (userPreferences.preferredCategories.has(features.category)) {
      reasons.push(`In your preferred ${features.category} category`);
    }

    // Check for difficulty preference
    if (userPreferences.preferredDifficulty.has(features.difficulty)) {
      reasons.push(`Matches your preferred ${features.difficulty} difficulty level`);
    }

    // High rating
    if (features.rating >= 4.5) {
      reasons.push('Highly rated by other learners');
    }

    // If no specific reasons, provide general ones
    if (reasons.length === 0) {
      if (score > 0.7) {
        reasons.push('Strong match with your learning profile');
      } else if (score > 0.5) {
        reasons.push('Good fit based on your interests');
      } else {
        reasons.push('Recommended for skill development');
      }
    }

    return reasons.slice(0, 3); // Limit to 3 reasons
  }

  /**
   * Create recommendation from similarity score
   */
  private createRecommendation(
    score: SimilarityScore,
    context: RecommendationContext,
  ): Partial<Recommendation> {
    return {
      userId: context.userId,
      courseId: score.courseId,
      recommendationType: RecommendationType.CONTENT_BASED,
      reason: this.determineRecommendationReason(score),
      confidenceScore: score.score,
      relevanceScore: score.score * 0.95, // Slightly lower than confidence
      priority: this.calculatePriority(score.score),
      explanation: score.reasons.join('. '),
      metadata: {
        algorithmUsed: 'content_similarity',
        similarityScore: score.score,
        reasons: score.reasons,
        matchedFeatures: {
          tags: score.features.tags.slice(0, 5),
          skills: score.features.skills.slice(0, 5),
          category: score.features.category,
          difficulty: score.features.difficulty,
        },
      },
    };
  }

  /**
   * Determine recommendation reason based on similarity
   */
  private determineRecommendationReason(score: SimilarityScore): RecommendationReason {
    if (score.reasons.some((reason) => reason.includes('skill'))) {
      return RecommendationReason.SKILL_BASED;
    } else if (score.reasons.some((reason) => reason.includes('interest'))) {
      return RecommendationReason.INTEREST_BASED;
    } else if (score.reasons.some((reason) => reason.includes('category'))) {
      return RecommendationReason.SIMILAR_CONTENT;
    } else {
      return RecommendationReason.CONTENT_BASED;
    }
  }

  /**
   * Calculate priority based on similarity score
   */
  private calculatePriority(score: number): number {
    if (score >= 0.8) return 5;
    if (score >= 0.6) return 4;
    if (score >= 0.4) return 3;
    if (score >= 0.2) return 2;
    return 1;
  }
}
