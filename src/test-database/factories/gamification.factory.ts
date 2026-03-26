import { Repository } from 'typeorm';
import { GamificationProfile } from '../../gamification/entities/gamification-profile.entity';
import { BaseFactory } from './base.factory';
import { User } from '../../auth/entities/user.entity';

export interface GamificationFactoryOptions {
  userId?: string;
  points?: number;
  xp?: number;
  level?: number;
  virtualCurrency?: number;
  currentStreak?: number;
  longestStreak?: number;
}

/**
 * Enhanced gamification factory for test data
 */
export class GamificationFactory extends BaseFactory<GamificationProfile> {
  protected getRepository(): Repository<GamificationProfile> {
    return this.dataSource.getRepository(GamificationProfile);
  }

  /**
   * Generate gamification profile data without persisting
   */
  generate(overrides: GamificationFactoryOptions = {}): GamificationProfile {
    return {
      id: this.randomUUID(),
      userId: overrides.userId || this.randomUUID(),
      points: overrides.points ?? this.randomNumber(0, 2000),
      xp: overrides.xp ?? this.randomNumber(0, 10000),
      level: overrides.level ?? this.randomNumber(1, 50),
      virtualCurrency: overrides.virtualCurrency ?? this.randomNumber(0, 1000),
      currentStreak: overrides.currentStreak ?? this.randomNumber(0, 100),
      longestStreak: overrides.longestStreak ?? this.randomNumber(0, 200),
      lastActivityDate: this.randomDate(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as GamificationProfile;
  }

  /**
   * Create and persist a gamification profile
   */
  async create(overrides: GamificationFactoryOptions = {}): Promise<GamificationProfile> {
    const profileData = this.generate(overrides);
    return this.save(profileData);
  }

  /**
   * Create gamification profiles for multiple users
   */
  async createProfilesForUsers(users: User[]): Promise<GamificationProfile[]> {
    const profiles: GamificationProfile[] = [];
    
    for (const user of users) {
      profiles.push(await this.create({ userId: user.id }));
    }
    
    return profiles;
  }

  /**
   * Create high-level profile
   */
  async createHighLevel(overrides: GamificationFactoryOptions = {}): Promise<GamificationProfile> {
    return this.create({
      ...overrides,
      level: this.randomNumber(30, 50),
      xp: this.randomNumber(5000, 10000),
      points: this.randomNumber(1000, 2000),
    });
  }

  /**
   * Create beginner profile
   */
  async createBeginner(overrides: GamificationFactoryOptions = {}): Promise<GamificationProfile> {
    return this.create({
      ...overrides,
      level: this.randomNumber(1, 5),
      xp: this.randomNumber(0, 500),
      points: this.randomNumber(0, 200),
    });
  }

  /**
   * Create profile with high streak
   */
  async createWithHighStreak(overrides: GamificationFactoryOptions = {}): Promise<GamificationProfile> {
    return this.create({
      ...overrides,
      currentStreak: this.randomNumber(50, 100),
      longestStreak: this.randomNumber(100, 200),
    });
  }
}
