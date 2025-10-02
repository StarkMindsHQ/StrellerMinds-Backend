import { Injectable, Inject, forwardRef, Logger, NotFoundException } from '@nestjs/common';
import { AchievementService } from '../gamification/services/achievement.service';
import { RewardService } from '../gamification/services/reward.service';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

/**
 * Service for tracking and calculating user lesson progress.
 */

@Injectable()
export class ProgressService {
  private userProgress = new Map<number, Set<number>>();
  private readonly logger = new Logger(ProgressService.name);

  constructor(
    @Inject(forwardRef(() => AchievementService))
    private readonly achievementService: AchievementService,
    @Inject(forwardRef(() => RewardService)) private readonly rewardService: RewardService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Mark a lesson as completed for a user.
   * @param userId - The ID of the user.
   * @param lessonId - The ID of the lesson to be marked as completed.
   */

  async completeLesson(userId: number, lessonId: number) {
    if (!this.userProgress.has(userId)) {
      this.userProgress.set(userId, new Set());
    }
    this.userProgress.get(userId).add(lessonId);

    // Gamification logic: unlock achievements and grant rewards
    try {
      const user = await this.userRepository.findOneBy({ id: String(userId) });
      if (!user) throw new NotFoundException('User not found');
      // Example: unlock an achievement for completing a lesson
      await this.achievementService.unlockAchievement(user, 1);
      // Example: grant a reward for completing a lesson
      await this.rewardService.grantReward(user, 1);
    } catch (error) {
      this.logger.error('Gamification error on lesson completion', error.stack);
    }
  }

  /**
   * Get the completion percentage of lessons for a user.
   * @param userId - The ID of the user.
   * @param totalLessons - The total number of lessons available.
   * @returns The completion percentage as a number.
   */
  getCompletionPercentage(userId: number, totalLessons: number): number {
    if (!this.userProgress.has(userId)) return 0;
    return (this.userProgress.get(userId).size / totalLessons) * 100;
  }

  /**
   * Get the progress data for a user, including completed lessons and completion percentage.
   * @param userId - The ID of the user.
   * @param totalLessons - The total number of lessons available.
   * @returns An object containing the user's ID, an array of completed lessons, and the completion percentage.
   */
  getProgressData(userId: number, totalLessons: number) {
    return {
      userId,
      completedLessons: Array.from(this.userProgress.get(userId) || []),
      completionPercentage: this.getCompletionPercentage(userId, totalLessons),
    };
  }
}
