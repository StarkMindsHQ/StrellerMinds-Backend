import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GamificationProfile } from './entities/gamification-profile.entity';
import { Badge } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
import { Reward } from './entities/reward.entity';
import { Challenge } from './entities/challenge.entity';

@Injectable()
export class GamificationService {
  constructor(
    @InjectRepository(GamificationProfile)
    private profileRepository: Repository<GamificationProfile>,
    @InjectRepository(Badge)
    private badgeRepository: Repository<Badge>,
    @InjectRepository(UserBadge)
    private userBadgeRepository: Repository<UserBadge>,
    @InjectRepository(Reward)
    private rewardRepository: Repository<Reward>,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
  ) {}

  async getProfile(userId: string): Promise<GamificationProfile> {
    let profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) {
      profile = this.profileRepository.create({ userId });
      await this.profileRepository.save(profile);
    }
    return profile;
  }

  async addXP(userId: string, amount: number): Promise<GamificationProfile> {
    const profile = await this.getProfile(userId);
    profile.xp += amount;
    profile.points += amount;

    const newLevel = Math.floor(Math.sqrt(profile.xp / 100)) + 1;
    if (newLevel > profile.level) {
      profile.level = newLevel;
    }

    return await this.profileRepository.save(profile);
  }

  async updateStreak(userId: string): Promise<GamificationProfile> {
    const profile = await this.getProfile(userId);
    const now = new Date();
    const lastActivity = profile.lastActivityDate;

    if (!lastActivity) {
      profile.currentStreak = 1;
    } else {
      const diffInDays = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 3600 * 24));
      if (diffInDays === 1) {
        profile.currentStreak += 1;
      } else if (diffInDays > 1) {
        profile.currentStreak = 1;
      }
    }

    if (profile.currentStreak > profile.longestStreak) {
      profile.longestStreak = profile.currentStreak;
    }

    profile.lastActivityDate = now;
    return await this.profileRepository.save(profile);
  }

  async earnBadge(userId: string, badgeCode: string): Promise<UserBadge> {
    const badge = await this.badgeRepository.findOne({ where: { code: badgeCode } });
    if (!badge) throw new NotFoundException('Badge not found');

    const existing = await this.userBadgeRepository.findOne({
      where: { userId, badgeId: badge.id },
    });
    if (existing) return existing;

    const userBadge = this.userBadgeRepository.create({ userId, badgeId: badge.id });
    const saved = await this.userBadgeRepository.save(userBadge);

    if (badge.xpReward > 0) {
      await this.addXP(userId, badge.xpReward);
    }

    return saved;
  }

  async getLeaderboard(limit = 10): Promise<GamificationProfile[]> {
    return await this.profileRepository.find({
      order: { points: 'DESC' },
      take: limit,
      relations: ['user'],
    });
  }

  async handleActivity(userId: string, activityType: string): Promise<void> {
    const xpMap: Record<string, number> = {
      login: 10,
      course_completed: 100,
      lesson_completed: 20,
      quiz_passed: 50,
    };
    const amount = xpMap[activityType] || 0;
    if (amount > 0) {
      await this.addXP(userId, amount);
    }
    if (activityType === 'login') {
      await this.updateStreak(userId);
    }
  }

  async getLevelProgress(userId: string) {
    const profile = await this.getProfile(userId);
    const currentLevelXP = Math.pow(profile.level - 1, 2) * 100;
    const nextLevelXP = Math.pow(profile.level, 2) * 100;
    const progress = ((profile.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

    return {
      level: profile.level,
      xp: profile.xp,
      nextLevelXP,
      progress: Math.min(100, Math.max(0, progress)),
    };
  }
}
