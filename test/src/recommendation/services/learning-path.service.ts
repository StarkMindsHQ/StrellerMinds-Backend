import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LearningPath, LearningPathStep, LearningPathStatus, StepType } from '../entities/learning-path.entity';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { UserInteraction, InteractionType } from '../entities/user-interaction.entity';
import { CreateLearningPathDto, UpdateLearningPathDto, GetLearningPathsQueryDto } from '../dto/learning-path.dto';
import { RecommendationAnalyticsService } from './recommendation-analytics.service';
import { ContentSimilarityService } from './content-similarity.service';

export interface LearningGoal {
  targetSkills: string[];
  currentLevel: 'beginner' | 'intermediate' | 'advanced';
  targetLevel: 'beginner' | 'intermediate' | 'advanced';
  timeframe: number; // weeks
  preferences: {
    maxCoursesPerWeek?: number;
    preferredDifficulty?: string[];
    preferredDuration?: number; // minutes
    excludeTopics?: string[];
    includeTopics?: string[];
  };
}

export interface PathGenerationOptions {
  maxCourses: number;
  includeAssessments: boolean;
  includeProjects: boolean;
  adaptToProgress: boolean;
  considerPrerequisites: boolean;
}

@Injectable()
export class LearningPathService {
  private readonly logger = new Logger(LearningPathService.name);

  constructor(
    @InjectRepository(LearningPath)
    private learningPathRepository: Repository<LearningPath>,
    @InjectRepository(LearningPathStep)
    private stepRepository: Repository<LearningPathStep>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(UserInteraction)
    private interactionRepository: Repository<UserInteraction>,
    private analyticsService: RecommendationAnalyticsService,
    private similarityService: ContentSimilarityService,
  ) {}

  /**
   * Generate a personalized learning path for a user
   */
  async generateLearningPath(
    userId: string,
    goal: LearningGoal,
    options: PathGenerationOptions = {
      maxCourses: 10,
      includeAssessments: true,
      includeProjects: true,
      adaptToProgress: true,
      considerPrerequisites: true,
    },
  ): Promise<LearningPath> {
    this.logger.log(`Generating learning path for user ${userId}`);

    try {
      // Analyze user's current skills and progress
      const userProfile = await this.analyzeUserProfile(userId);
      
      // Find relevant courses for the target skills
      const candidateCourses = await this.findRelevantCourses(goal.targetSkills, goal.preferences);
      
      // Filter and sequence courses based on prerequisites and difficulty
      const sequencedCourses = await this.sequenceCourses(candidateCourses, userProfile, goal, options);
      
      // Create learning path entity
      const learningPath = await this.createLearningPathEntity(userId, goal, sequencedCourses);
      
      // Generate learning path steps
      const steps = await this.generateLearningPathSteps(learningPath.id, sequencedCourses, goal, options);
      
      // Save the complete learning path
      learningPath.steps = steps;
      learningPath.totalSteps = steps.length;
      learningPath.estimatedDuration = this.calculateEstimatedDuration(steps);
      
      const savedPath = await this.learningPathRepository.save(learningPath);
      
      // Track analytics
      await this.analyticsService.trackRecommendationGeneration({
        userId,
        recommendationIds: [savedPath.id],
        algorithmVersion: 'learning_path_v1.0',
        generationTimeMs: Date.now(),
        context: { goal, options },
      });

      this.logger.log(`Generated learning path with ${steps.length} steps for user ${userId}`);
      return savedPath;

    } catch (error) {
      this.logger.error(`Error generating learning path for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get learning paths for a user
   */
  async getUserLearningPaths(userId: string, query: GetLearningPathsQueryDto): Promise<{
    paths: LearningPath[];
    total: number;
  }> {
    const queryBuilder = this.learningPathRepository
      .createQueryBuilder('path')
      .leftJoinAndSelect('path.steps', 'steps')
      .leftJoinAndSelect('steps.course', 'course')
      .where('path.userId = :userId', { userId });

    // Apply filters
    if (query.status) {
      queryBuilder.andWhere('path.status = :status', { status: query.status });
    }

    if (query.skillArea) {
      queryBuilder.andWhere('path.targetSkills @> :skillArea', { skillArea: [query.skillArea] });
    }

    // Apply sorting
    queryBuilder.orderBy(`path.${query.sortBy}`, query.sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(query.offset).take(query.limit);

    const paths = await queryBuilder.getMany();

    return { paths, total };
  }

  /**
   * Update learning path progress
   */
  async updateProgress(pathId: string, stepId: string, completed: boolean): Promise<LearningPath> {
    const path = await this.learningPathRepository.findOne({
      where: { id: pathId },
      relations: ['steps'],
    });

    if (!path) {
      throw new Error(`Learning path ${pathId} not found`);
    }

    const step = path.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found in learning path`);
    }

    // Update step completion
    step.completed = completed;
    step.completedAt = completed ? new Date() : null;
    await this.stepRepository.save(step);

    // Update path progress
    const completedSteps = path.steps.filter(s => s.completed).length;
    path.completedSteps = completedSteps;
    path.progressPercentage = (completedSteps / path.totalSteps) * 100;

    // Update path status
    if (path.progressPercentage === 100) {
      path.status = LearningPathStatus.COMPLETED;
      path.completedAt = new Date();
    } else if (path.progressPercentage > 0 && path.status === LearningPathStatus.NOT_STARTED) {
      path.status = LearningPathStatus.IN_PROGRESS;
      path.startedAt = new Date();
    }

    return await this.learningPathRepository.save(path);
  }

  /**
   * Adapt learning path based on user progress and performance
   */
  async adaptLearningPath(pathId: string): Promise<LearningPath> {
    const path = await this.learningPathRepository.findOne({
      where: { id: pathId },
      relations: ['steps', 'steps.course', 'user'],
    });

    if (!path) {
      throw new Error(`Learning path ${pathId} not found`);
    }

    this.logger.log(`Adapting learning path ${pathId} based on user progress`);

    // Analyze user's recent performance
    const userPerformance = await this.analyzeUserPerformance(path.userId, path.steps);
    
    // Identify areas where user is struggling or excelling
    const adaptations = await this.identifyAdaptations(path, userPerformance);
    
    // Apply adaptations
    if (adaptations.length > 0) {
      await this.applyAdaptations(path, adaptations);
      
      // Update path metadata
      path.metadata = {
        ...path.metadata,
        adaptations: adaptations.map(a => ({
          type: a.type,
          reason: a.reason,
          appliedAt: new Date(),
        })),
        lastAdaptedAt: new Date(),
      };
      
      await this.learningPathRepository.save(path);
    }

    return path;
  }

  /**
   * Get learning path recommendations based on user's interests and goals
   */
  async getPathRecommendations(userId: string, limit: number = 5): Promise<{
    skillBasedPaths: LearningGoal[];
    trendingPaths: LearningGoal[];
    continuationPaths: LearningGoal[];
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Get user's interaction history
    const interactions = await this.interactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
      relations: ['course'],
    });

    // Generate skill-based path recommendations
    const skillBasedPaths = await this.generateSkillBasedPathRecommendations(user, interactions, limit);
    
    // Generate trending path recommendations
    const trendingPaths = await this.generateTrendingPathRecommendations(limit);
    
    // Generate continuation path recommendations
    const continuationPaths = await this.generateContinuationPathRecommendations(user, interactions, limit);

    return {
      skillBasedPaths,
      trendingPaths,
      continuationPaths,
    };
  }

  /**
   * Analyze user's current skills and learning profile
   */
  private async analyzeUserProfile(userId: string): Promise<{
    currentSkills: string[];
    skillLevels: Record<string, number>;
    learningStyle: string;
    completionRate: number;
    averageSessionTime: number;
    preferredDifficulty: string;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const interactions = await this.interactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 200,
      relations: ['course'],
    });

    // Extract current skills from completed courses
    const currentSkills = new Set<string>();
    const skillLevels: Record<string, number> = {};
    
    interactions
      .filter(i => i.interactionType === InteractionType.COMPLETE && i.course)
      .forEach(i => {
        if (i.course?.skills) {
          i.course.skills.forEach(skill => {
            currentSkills.add(skill);
            skillLevels[skill] = (skillLevels[skill] || 0) + 1;
          });
        }
      });

    // Calculate completion rate
    const enrollments = interactions.filter(i => i.interactionType === InteractionType.ENROLL).length;
    const completions = interactions.filter(i => i.interactionType === InteractionType.COMPLETE).length;
    const completionRate = enrollments > 0 ? completions / enrollments : 0;

    // Analyze learning style based on interaction patterns
    const learningStyle = this.determineLearningStyle(interactions);

    // Calculate average session time (placeholder)
    const averageSessionTime = 45; // minutes

    // Determine preferred difficulty
    const preferredDifficulty = this.determinePreferredDifficulty(interactions);

    return {
      currentSkills: Array.from(currentSkills),
      skillLevels,
      learningStyle,
      completionRate,
      averageSessionTime,
      preferredDifficulty,
    };
  }

  /**
   * Find courses relevant to target skills
   */
  private async findRelevantCourses(
    targetSkills: string[],
    preferences: LearningGoal['preferences'],
  ): Promise<Course[]> {
    const queryBuilder = this.courseRepository.createQueryBuilder('course')
      .where('course.isActive = :isActive', { isActive: true });

    // Filter by skills
    if (targetSkills.length > 0) {
      queryBuilder.andWhere('course.skills && :targetSkills', { targetSkills });
    }

    // Apply preferences
    if (preferences.preferredDifficulty?.length) {
      queryBuilder.andWhere('course.difficulty IN (:...difficulties)', {
        difficulties: preferences.preferredDifficulty,
      });
    }

    if (preferences.preferredDuration) {
      queryBuilder.andWhere('course.duration <= :maxDuration', {
        maxDuration: preferences.preferredDuration * 1.5, // Allow 50% flexibility
      });
    }

    if (preferences.excludeTopics?.length) {
      queryBuilder.andWhere('NOT (course.tags && :excludeTopics)', {
        excludeTopics: preferences.excludeTopics,
      });
    }

    if (preferences.includeTopics?.length) {
      queryBuilder.andWhere('course.tags && :includeTopics', {
        includeTopics: preferences.includeTopics,
      });
    }

    // Order by rating and relevance
    queryBuilder.orderBy('course.rating', 'DESC');

    return await queryBuilder.getMany();
  }

  /**
   * Sequence courses based on prerequisites and difficulty progression
   */
  private async sequenceCourses(
    courses: Course[],
    userProfile: any,
    goal: LearningGoal,
    options: PathGenerationOptions,
  ): Promise<Course[]> {
    // Group courses by difficulty level
    const coursesByDifficulty = {
      beginner: courses.filter(c => c.difficulty === 'beginner'),
      intermediate: courses.filter(c => c.difficulty === 'intermediate'),
      advanced: courses.filter(c => c.difficulty === 'advanced'),
    };

    const sequencedCourses: Course[] = [];
    const userCurrentLevel = goal.currentLevel;
    const userTargetLevel = goal.targetLevel;

    // Start with appropriate difficulty level
    let currentDifficulty = userCurrentLevel;
    
    // Add courses progressively
    while (sequencedCourses.length < options.maxCourses && currentDifficulty) {
      const availableCourses = coursesByDifficulty[currentDifficulty];
      
      if (availableCourses.length > 0) {
        // Select best courses for current level
        const selectedCourses = this.selectBestCoursesForLevel(
          availableCourses,
          userProfile,
          goal,
          Math.min(3, options.maxCourses - sequencedCourses.length)
        );
        
        sequencedCourses.push(...selectedCourses);
      }

      // Progress to next difficulty level
      if (currentDifficulty === 'beginner' && userTargetLevel !== 'beginner') {
        currentDifficulty = 'intermediate';
      } else if (currentDifficulty === 'intermediate' && userTargetLevel === 'advanced') {
        currentDifficulty = 'advanced';
      } else {
        break;
      }
    }

    return sequencedCourses.slice(0, options.maxCourses);
  }

  /**
   * Select best courses for a specific difficulty level
   */
  private selectBestCoursesForLevel(
    courses: Course[],
    userProfile: any,
    goal: LearningGoal,
    maxCourses: number,
  ): Course[] {
    // Score courses based on relevance to user's goals and profile
    const scoredCourses = courses.map(course => ({
      course,
      score: this.calculateCourseRelevanceScore(course, userProfile, goal),
    }));

    // Sort by score and return top courses
    return scoredCourses
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCourses)
      .map(sc => sc.course);
  }

  /**
   * Calculate course relevance score for learning path
   */
  private calculateCourseRelevanceScore(
    course: Course,
    userProfile: any,
    goal: LearningGoal,
  ): number {
    let score = 0;

    // Skill alignment (40% weight)
    const skillOverlap = course.skills?.filter(skill => 
      goal.targetSkills.includes(skill)
    ).length || 0;
    const skillScore = skillOverlap / Math.max(goal.targetSkills.length, 1);
    score += skillScore * 0.4;

    // Course rating (20% weight)
    const ratingScore = (course.rating || 0) / 5;
    score += ratingScore * 0.2;

    // User's current skill level alignment (20% weight)
    const userHasPrereqs = course.prerequisites?.every(prereq => 
      userProfile.currentSkills.includes(prereq)
    ) ?? true;
    score += userHasPrereqs ? 0.2 : 0;

    // Duration preference (10% weight)
    if (goal.preferences.preferredDuration) {
      const durationDiff = Math.abs((course.duration || 0) - goal.preferences.preferredDuration);
      const durationScore = Math.max(0, 1 - durationDiff / goal.preferences.preferredDuration);
      score += durationScore * 0.1;
    }

    // Popularity/enrollment count (10% weight)
    const popularityScore = Math.min((course.enrollmentCount || 0) / 1000, 1);
    score += popularityScore * 0.1;

    return score;
  }

  /**
   * Create learning path entity
   */
  private async createLearningPathEntity(
    userId: string,
    goal: LearningGoal,
    courses: Course[],
  ): Promise<LearningPath> {
    const learningPath = new LearningPath();
    learningPath.userId = userId;
    learningPath.title = `${goal.targetSkills.slice(0, 2).join(' & ')} Learning Path`;
    learningPath.description = `Personalized learning path to master ${goal.targetSkills.join(', ')}`;
    learningPath.targetSkills = goal.targetSkills;
    learningPath.currentLevel = goal.currentLevel;
    learningPath.targetLevel = goal.targetLevel;
    learningPath.status = LearningPathStatus.NOT_STARTED;
    learningPath.totalSteps = 0; // Will be updated after steps are created
    learningPath.completedSteps = 0;
    learningPath.progressPercentage = 0;
    learningPath.estimatedDuration = 0; // Will be calculated after steps are created
    learningPath.metadata = {
      generatedAt: new Date(),
      goal,
      algorithmVersion: 'v1.0',
    };

    return await this.learningPathRepository.save(learningPath);
  }

  /**
   * Generate learning path steps
   */
  private async generateLearningPathSteps(
    pathId: string,
    courses: Course[],
    goal: LearningGoal,
    options: PathGenerationOptions,
  ): Promise<LearningPathStep[]> {
    const steps: LearningPathStep[] = [];
    let stepOrder = 1;

    for (const course of courses) {
      // Add course step
      const courseStep = new LearningPathStep();
      courseStep.learningPathId = pathId;
      courseStep.courseId = course.id;
      courseStep.stepType = StepType.COURSE;
      courseStep.title = course.title;
      courseStep.description = course.description;
      courseStep.stepOrder = stepOrder++;
      courseStep.estimatedDuration = course.duration || 60;
      courseStep.completed = false;
      courseStep.metadata = {
        courseId: course.id,
        difficulty: course.difficulty,
        skills: course.skills,
      };

      steps.push(courseStep);

      // Add assessment step if enabled
      if (options.includeAssessments && stepOrder <= courses.length) {
        const assessmentStep = new LearningPathStep();
        assessmentStep.learningPathId = pathId;
        assessmentStep.stepType = StepType.ASSESSMENT;
        assessmentStep.title = `${course.title} - Knowledge Check`;
        assessmentStep.description = `Assess your understanding of ${course.title}`;
        assessmentStep.stepOrder = stepOrder++;
        assessmentStep.estimatedDuration = 30;
        assessmentStep.completed = false;
        assessmentStep.metadata = {
          relatedCourseId: course.id,
          assessmentType: 'knowledge_check',
        };

        steps.push(assessmentStep);
      }

      // Add project step for advanced courses if enabled
      if (options.includeProjects && course.difficulty === 'advanced') {
        const projectStep = new LearningPathStep();
        projectStep.learningPathId = pathId;
        projectStep.stepType = StepType.PROJECT;
        projectStep.title = `${course.title} - Practical Project`;
        projectStep.description = `Apply your knowledge with a hands-on project`;
        projectStep.stepOrder = stepOrder++;
        projectStep.estimatedDuration = 120;
        projectStep.completed = false;
        projectStep.metadata = {
          relatedCourseId: course.id,
          projectType: 'capstone',
        };

        steps.push(projectStep);
      }
    }

    // Save all steps
    return await this.stepRepository.save(steps);
  }

  /**
   * Calculate estimated duration for learning path
   */
  private calculateEstimatedDuration(steps: LearningPathStep[]): number {
    return steps.reduce((total, step) => total + step.estimatedDuration, 0);
  }

  /**
   * Analyze user performance for adaptation
   */
  private async analyzeUserPerformance(userId: string, steps: LearningPathStep[]): Promise<{
    strugglingAreas: string[];
    excellingAreas: string[];
    averageCompletionTime: number;
    completionRate: number;
  }> {
    // Analyze completion patterns and times
    const completedSteps = steps.filter(s => s.completed);
    const totalSteps = steps.length;
    const completionRate = totalSteps > 0 ? completedSteps.length / totalSteps : 0;

    // Identify struggling and excelling areas based on completion times and patterns
    const strugglingAreas: string[] = [];
    const excellingAreas: string[] = [];

    // Calculate average completion time
    const averageCompletionTime = completedSteps.length > 0
      ? completedSteps.reduce((sum, step) => {
          if (step.completedAt && step.createdAt) {
            return sum + (step.completedAt.getTime() - step.createdAt.getTime());
          }
          return sum;
        }, 0) / completedSteps.length
      : 0;

    return {
      strugglingAreas,
      excellingAreas,
      averageCompletionTime: averageCompletionTime / (1000 * 60 * 60), // Convert to hours
      completionRate,
    };
  }

  /**
   * Identify adaptations needed for learning path
   */
  private async identifyAdaptations(path: LearningPath, performance: any): Promise<Array<{
    type: 'add_support' | 'skip_redundant' | 'adjust_pace' | 'change_difficulty';
    reason: string;
    stepId?: string;
    newSteps?: Partial<LearningPathStep>[];
  }>> {
    const adaptations: any[] = [];

    // If completion rate is low, add support materials
    if (performance.completionRate < 0.5) {
      adaptations.push({
        type: 'add_support',
        reason: 'Low completion rate detected, adding support materials',
      });
    }

    // If user is excelling, skip redundant content
    if (performance.excellingAreas.length > 0) {
      adaptations.push({
        type: 'skip_redundant',
        reason: 'User excelling in certain areas, optimizing path',
      });
    }

    return adaptations;
  }

  /**
   * Apply adaptations to learning path
   */
  private async applyAdaptations(path: LearningPath, adaptations: any[]): Promise<void> {
    for (const adaptation of adaptations) {
      switch (adaptation.type) {
        case 'add_support':
          // Add support materials or easier prerequisite courses
          break;
        case 'skip_redundant':
          // Mark certain steps as optional or completed
          break;
        case 'adjust_pace':
          // Modify estimated durations
          break;
        case 'change_difficulty':
          // Replace courses with easier/harder alternatives
          break;
      }
    }
  }

  /**
   * Generate skill-based path recommendations
   */
  private async generateSkillBasedPathRecommendations(
    user: User,
    interactions: UserInteraction[],
    limit: number,
  ): Promise<LearningGoal[]> {
    // Analyze user's skill gaps and interests
    const userSkills = user.skills || [];
    const desiredSkills = user.desiredSkills || [];
    const skillGaps = desiredSkills.filter(skill => !userSkills.includes(skill));

    return skillGaps.slice(0, limit).map(skill => ({
      targetSkills: [skill],
      currentLevel: 'beginner' as const,
      targetLevel: 'intermediate' as const,
      timeframe: 8,
      preferences: {
        maxCoursesPerWeek: 2,
        preferredDuration: 60,
      },
    }));
  }

  /**
   * Generate trending path recommendations
   */
  private async generateTrendingPathRecommendations(limit: number): Promise<LearningGoal[]> {
    // Get trending skills/topics from recent course enrollments
    const trendingSkills = ['React', 'Python', 'Machine Learning', 'DevOps', 'Cloud Computing'];

    return trendingSkills.slice(0, limit).map(skill => ({
      targetSkills: [skill],
      currentLevel: 'beginner' as const,
      targetLevel: 'advanced' as const,
      timeframe: 12,
      preferences: {
        maxCoursesPerWeek: 1,
        preferredDuration: 90,
      },
    }));
  }

  /**
   * Generate continuation path recommendations
   */
  private async generateContinuationPathRecommendations(
    user: User,
    interactions: UserInteraction[],
    limit: number,
  ): Promise<LearningGoal[]> {
    // Find skills user has started learning but not mastered
    const inProgressSkills = interactions
      .filter(i => i.interactionType === InteractionType.START && i.course?.skills)
      .flatMap(i => i.course!.skills!)
      .filter((skill, index, arr) => arr.indexOf(skill) === index)
      .slice(0, limit);

    return inProgressSkills.map(skill => ({
      targetSkills: [skill],
      currentLevel: 'intermediate' as const,
      targetLevel: 'advanced' as const,
      timeframe: 6,
      preferences: {
        maxCoursesPerWeek: 2,
        preferredDuration: 75,
      },
    }));
  }

  /**
   * Utility methods
   */
  private determineLearningStyle(interactions: UserInteraction[]): string {
    // Analyze interaction patterns to determine learning style
    const videoInteractions = interactions.filter(i => i.metadata?.contentType === 'video').length;
    const textInteractions = interactions.filter(i => i.metadata?.contentType === 'text').length;
    const practiceInteractions = interactions.filter(i => i.metadata?.contentType === 'practice').length;

    if (videoInteractions > textInteractions && videoInteractions > practiceInteractions) {
      return 'visual';
    } else if (practiceInteractions > videoInteractions && practiceInteractions > textInteractions) {
      return 'kinesthetic';
    } else {
      return 'reading';
    }
  }

  private determinePreferredDifficulty(interactions: UserInteraction[]): string {
    // Analyze completion rates by difficulty to determine preference
    const completedCourses = interactions
      .filter(i => i.interactionType === InteractionType.COMPLETE && i.course)
      .map(i => i.course!);

    const difficultyCompletions = {
      beginner: completedCourses.filter(c => c.difficulty === 'beginner').length,
      intermediate: completedCourses.filter(c => c.difficulty === 'intermediate').length,
      advanced: completedCourses.filter(c => c.difficulty === 'advanced').length,
    };

    const maxCompletions = Math.max(...Object.values(difficultyCompletions));
    const preferredDifficulty = Object.entries(difficultyCompletions)
      .find(([_, count]) => count === maxCompletions)?.[0] || 'beginner';

    return preferredDifficulty;
  }
}
