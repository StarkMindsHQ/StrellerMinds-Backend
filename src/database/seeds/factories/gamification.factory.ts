import { BaseFactory } from './base.factory';
import { GamificationProfile, AchievementType } from '../../gamification/entities/gamification-profile.entity';
import { User } from '../../auth/entities/user.entity';

export interface GamificationFactoryOptions {
  user?: User;
  totalPoints?: number;
  level?: number;
  streak?: number;
  badges?: string[];
}

/**
 * Factory for generating gamification profile test data
 */
export class GamificationFactory extends BaseFactory<GamificationProfile> {
  private static readonly BADGE_TYPES = [
    'first_course',
    'fast_learner',
    'dedicated_student',
    'perfect_score',
    'helpful_peer',
    'course_master',
    'streak_warrior',
    'achievement_hunter',
    'social_butterfly',
    'knowledge_seeker',
  ];

  private static readonly ACHIEVEMENT_TYPES = Object.values(AchievementType);

  protected getRepository() {
    return this.dataSource.getRepository(GamificationProfile);
  }

  async create(overrides: GamificationFactoryOptions = {}): Promise<GamificationProfile> {
    const profileData = this.generate(overrides);
    return await this.save(profileData);
  }

  generate(overrides: GamificationFactoryOptions = {}): GamificationProfile {
    const totalPoints = overrides.totalPoints || this.randomNumber(0, 5000);
    const level = overrides.level || this.calculateLevel(totalPoints);
    const streak = overrides.streak || this.randomNumber(0, 100);
    const badges = overrides.badges || this.randomPickMany(GamificationFactory.BADGE_TYPES, this.randomNumber(0, 5));

    return {
      id: this.randomUUID(),
      user: overrides.user || null,
      totalPoints,
      level,
      experiencePoints: totalPoints % 1000, // 1000 points per level
      streak,
      badges,
      achievements: this.generateAchievements(),
      lastLoginDate: this.randomDate(),
      totalStudyTime: this.randomNumber(0, 10000), // minutes
      coursesCompleted: this.randomNumber(0, 20),
      averageScore: this.randomNumber(60, 100),
      rank: this.randomNumber(1, 1000),
      createdAt: this.randomDate(),
      updatedAt: new Date(),
    } as GamificationProfile;
  }

  /**
   * Calculate level based on points (1000 points per level)
   */
  private calculateLevel(points: number): number {
    return Math.floor(points / 1000) + 1;
  }

  /**
   * Generate random achievements
   */
  private generateAchievements(): Array<{
    type: AchievementType;
    name: string;
    description: string;
    points: number;
    unlockedAt: Date;
  }> {
    const achievementCount = this.randomNumber(0, 10);
    const achievements = [];

    for (let i = 0; i < achievementCount; i++) {
      const type = this.randomPick(GamificationFactory.ACHIEVEMENT_TYPES);
      achievements.push({
        type,
        name: this.generateAchievementName(type),
        description: this.generateAchievementDescription(type),
        points: this.randomNumber(50, 500),
        unlockedAt: this.randomDate(),
      });
    }

    return achievements;
  }

  /**
   * Generate achievement name based on type
   */
  private generateAchievementName(type: AchievementType): string {
    const names = {
      [AchievementType.FIRST_COURSE]: ['Course Pioneer', 'First Steps', 'Beginning Journey'],
      [AchievementType.COURSE_COMPLETION]: ['Course Graduate', 'Completion Master', 'Dedicated Learner'],
      [AchievementType.PERFECT_SCORE]: ['Perfect Score', 'Flawless Victory', '100% Club'],
      [AchievementType.STREAK_MASTER]: ['Streak Warrior', 'Consistent Learner', 'Daily Champion'],
      [AchievementType.SOCIAL_BUTTERFLY]: ['Social Butterfly', 'Community Helper', 'Peer Mentor'],
    };

    const typeNames = names[type] || ['Achievement Unlocked', 'Milestone Reached', 'Success'];
    return this.randomPick(typeNames);
  }

  /**
   * Generate achievement description based on type
   */
  private generateAchievementDescription(type: AchievementType): string {
    const descriptions = {
      [AchievementType.FIRST_COURSE]: 'Completed your first course',
      [AchievementType.COURSE_COMPLETION]: 'Successfully completed a course',
      [AchievementType.PERFECT_SCORE]: 'Achieved a perfect score on an assessment',
      [AchievementType.STREAK_MASTER]: 'Maintained a learning streak for 30 days',
      [AchievementType.SOCIAL_BUTTERFLY]: 'Helped 10 fellow students',
    };

    return descriptions[type] || 'Unlocked a special achievement';
  }

  /**
   * Create profile for beginner user
   */
  async createBeginner(user: User): Promise<GamificationProfile> {
    return await this.create({
      user,
      totalPoints: this.randomNumber(0, 500),
      level: 1,
      streak: this.randomNumber(0, 7),
      badges: this.randomPickMany(GamificationFactory.BADGE_TYPES, 1),
    });
  }

  /**
   * Create profile for intermediate user
   */
  async createIntermediate(user: User): Promise<GamificationProfile> {
    return await this.create({
      user,
      totalPoints: this.randomNumber(1000, 3000),
      level: this.randomNumber(2, 4),
      streak: this.randomNumber(10, 30),
      badges: this.randomPickMany(GamificationFactory.BADGE_TYPES, 3),
    });
  }

  /**
   * Create profile for advanced user
   */
  async createAdvanced(user: User): Promise<GamificationProfile> {
    return await this.create({
      user,
      totalPoints: this.randomNumber(3000, 5000),
      level: this.randomNumber(4, 6),
      streak: this.randomNumber(30, 100),
      badges: this.randomPickMany(GamificationFactory.BADGE_TYPES, 5),
    });
  }
}
