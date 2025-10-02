import { Injectable, Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { UserCourseInteraction } from '../../users/entities/user-course-interaction.entity';
import type { Course } from '../../courses/entities/course.entity';
import type { User } from '../../users/entities/user.entity';
import type { CourseCompletionPrediction } from '../entities/course-completion-prediction.entity';
import type { PredictCompletionDto } from '../dto/predict-completion.dto';
import type { PredictiveAnalyticsResult } from '../interfaces/analytics.interface';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MoreThanOrEqual } from 'typeorm';

@Injectable()
export class PredictiveAnalyticsService {
  private readonly logger = new Logger(PredictiveAnalyticsService.name);

  constructor(
    private readonly userInteractionRepository: Repository<UserCourseInteraction>,
    private readonly courseRepository: Repository<Course>,
    private readonly userRepository: Repository<User>,
    private readonly predictionRepository: Repository<CourseCompletionPrediction>,
  ) {}

  async predictCourseCompletion(dto: PredictCompletionDto): Promise<PredictiveAnalyticsResult> {
    const { userId, courseId, currentProgress = 0, timeSpent = 0 } = dto;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    const course = await this.courseRepository.findOne({ where: { id: courseId } });

    if (!user || !course) {
      throw new Error('User or Course not found');
    }

    // Fetch historical data for the user and course
    const userInteractions = await this.userInteractionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const courseInteractions = await this.userInteractionRepository.find({
      where: { courseId },
      order: { createdAt: 'DESC' },
    });

    // --- Simplified Predictive Model (Rule-based / Statistical) ---
    let completionLikelihood = 0.5; // Base likelihood

    // Factor 1: User's past completion rate
    const completedCourses = userInteractions.filter((i) => i.completed).length;
    const enrolledCourses = userInteractions.length;
    const userCompletionRate = enrolledCourses > 0 ? completedCourses / enrolledCourses : 0.5;
    completionLikelihood += (userCompletionRate - 0.5) * 0.3; // Adjust by 30% based on user's history

    // Factor 2: Current progress vs. expected progress
    const expectedTimeForProgress = (course.duration || 120) * (currentProgress / 100);
    if (timeSpent >= expectedTimeForProgress) {
      completionLikelihood += 0.1; // User is on track or ahead
    } else {
      completionLikelihood -= 0.1; // User is behind
    }

    // Factor 3: Course difficulty (assuming 'difficulty' field on Course)
    if (course.difficulty === 'advanced') {
      completionLikelihood -= 0.1;
    } else if (course.difficulty === 'beginner') {
      completionLikelihood += 0.05;
    }

    // Factor 4: Recent activity (e.g., last interaction within a week)
    const lastInteraction = userInteractions[0];
    if (
      lastInteraction &&
      new Date().getTime() - lastInteraction.updatedAt.getTime() < 7 * 24 * 60 * 60 * 1000
    ) {
      completionLikelihood += 0.05;
    } else {
      completionLikelihood -= 0.05;
    }

    // Clamp likelihood between 0 and 1
    completionLikelihood = Math.max(0, Math.min(1, completionLikelihood));

    // Estimate predicted completion date
    let predictedCompletionDate: Date | null = null;
    if (completionLikelihood > 0.7) {
      const remainingProgress = 100 - currentProgress;
      const remainingTimeNeeded =
        ((course.duration || 120) - timeSpent) * (remainingProgress / 100);
      predictedCompletionDate = new Date(new Date().getTime() + remainingTimeNeeded * 60 * 1000); // Convert minutes to milliseconds
    }

    const factors = {
      userCompletionRate,
      currentProgress,
      timeSpent,
      courseDifficulty: course.difficulty,
      lastInteractionDate: lastInteraction?.updatedAt,
    };

    // Save prediction
    let prediction = await this.predictionRepository.findOne({ where: { userId, courseId } });
    if (prediction) {
      prediction.completionLikelihood = completionLikelihood;
      prediction.predictedCompletionDate = predictedCompletionDate;
      prediction.factors = factors;
      prediction.predictionDate = new Date();
    } else {
      prediction = this.predictionRepository.create({
        userId,
        courseId,
        completionLikelihood,
        predictedCompletionDate,
        factors,
      });
    }
    await this.predictionRepository.save(prediction);

    // Generate recommendations based on prediction
    const recommendations: string[] = [];
    if (completionLikelihood < 0.4) {
      recommendations.push('User might need additional support or motivation.');
      recommendations.push(
        `Suggest simpler courses or shorter modules related to "${course.title}".`,
      );
    } else if (completionLikelihood < 0.7) {
      recommendations.push('User is on track, but could benefit from engagement nudges.');
      recommendations.push(
        `Recommend related resources or community discussions for "${course.title}".`,
      );
    } else {
      recommendations.push('User is highly likely to complete the course.');
      recommendations.push(`Suggest advanced topics or next courses after "${course.title}".`);
    }

    return { prediction, recommendations };
  }

  async getUserCompletionPredictions(userId: string): Promise<CourseCompletionPrediction[]> {
    return this.predictionRepository.find({
      where: { userId },
      relations: ['course'],
      order: { predictionDate: 'DESC' },
    });
  }

  async getCourseCompletionPredictions(courseId: string): Promise<CourseCompletionPrediction[]> {
    return this.predictionRepository.find({
      where: { courseId },
      relations: ['user'],
      order: { completionLikelihood: 'ASC' },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async batchPredictCourseCompletions() {
    this.logger.log('Starting batch prediction for active course enrollments...');
    try {
      // Find all active user-course interactions that are not yet completed
      const activeInteractions = await this.userInteractionRepository.find({
        where: {
          completed: false,
          progress: MoreThanOrEqual(1), // At least started
        },
        relations: ['user', 'course'],
      });

      for (const interaction of activeInteractions) {
        try {
          await this.predictCourseCompletion({
            userId: interaction.userId,
            courseId: interaction.courseId,
            currentProgress: interaction.progress,
            timeSpent: interaction.timeSpent,
          });
        } catch (innerError) {
          this.logger.error(
            `Failed to predict for user ${interaction.userId} course ${interaction.courseId}: ${innerError.message}`,
          );
        }
      }
      this.logger.log(`Batch prediction completed for ${activeInteractions.length} interactions.`);
    } catch (error) {
      this.logger.error('Error during batch prediction:', error.stack);
    }
  }
}
