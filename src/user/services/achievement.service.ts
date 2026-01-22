import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Badge } from '../entities/badge.entity';
import { UserBadge } from '../entities/user-badge.entity';
import { UserProfile } from '../entities/user-profile.entity';
import {
  BadgeResponseDto,
  AwardBadgeDto,
  AchievementStatsDto,
  LeaderboardDto,
} from '../dto/achievement.dto';

@Injectable()
export class AchievementService {
  constructor(
    @InjectRepository(Badge)
    private badgeRepository: Repository<Badge>,
    @InjectRepository(UserBadge)
    private userBadgeRepository: Repository<UserBadge>,
    @InjectRepository(UserProfile)
    private profileRepository: Repository<UserProfile>,
  ) {}

  async createBadge(createDto: any): Promise<BadgeResponseDto> {
    const badge = this.badgeRepository.create(createDto);
    const saved = await this.badgeRepository.save(badge);
    return this.mapBadgeToResponseDto(saved);
  }

  async getAllBadges(): Promise<BadgeResponseDto[]> {
    const badges = await this.badgeRepository.find({
      where: { isActive: true },
      order: { rarity: 'DESC', createdAt: 'DESC' },
    });

    return badges.map((badge) => this.mapBadgeToResponseDto(badge));
  }

  async getBadgeById(badgeId: string): Promise<BadgeResponseDto> {
    const badge = await this.badgeRepository.findOne({
      where: { id: badgeId },
    });

    if (!badge) {
      throw new NotFoundException('Badge not found');
    }

    return this.mapBadgeToResponseDto(badge);
  }

  async awardBadgeToUser(
    profileId: string,
    awardDto: AwardBadgeDto,
  ): Promise<UserBadge> {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const badge = await this.badgeRepository.findOne({
      where: { id: awardDto.badgeId },
    });

    if (!badge) {
      throw new NotFoundException('Badge not found');
    }

    // Check if user already has this badge
    const existingBadge = await this.userBadgeRepository.findOne({
      where: { profileId, badgeId: awardDto.badgeId },
    });

    if (existingBadge) {
      // Update level if applicable
      existingBadge.level = (existingBadge.level || 1) + 1;
      await this.userBadgeRepository.save(existingBadge);
      return existingBadge;
    }

    const userBadge = this.userBadgeRepository.create({
      profileId,
      badgeId: awardDto.badgeId,
      unlockedReason: awardDto.unlockedReason,
    });

    const saved = await this.userBadgeRepository.save(userBadge);

    // Update counts
    profile.badgesCount++;
    badge.totalAwarded++;

    await Promise.all([
      this.profileRepository.save(profile),
      this.badgeRepository.save(badge),
    ]);

    return saved;
  }

  async getUserBadges(profileId: string): Promise<UserBadge[]> {
    const badges = await this.userBadgeRepository.find({
      where: { profileId, isVisible: true },
      relations: ['badge'],
      order: { awardedAt: 'DESC' },
    });

    return badges;
  }

  async removeBadge(profileId: string, badgeId: string): Promise<void> {
    const userBadge = await this.userBadgeRepository.findOne({
      where: { profileId, badgeId },
    });

    if (!userBadge) {
      throw new NotFoundException('Badge not found for this user');
    }

    await this.userBadgeRepository.remove(userBadge);

    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
    });

    if (profile && profile.badgesCount > 0) {
      profile.badgesCount--;
      await this.profileRepository.save(profile);
    }
  }

  async toggleBadgeVisibility(
    profileId: string,
    badgeId: string,
    isVisible: boolean,
  ): Promise<UserBadge> {
    const userBadge = await this.userBadgeRepository.findOne({
      where: { profileId, badgeId },
    });

    if (!userBadge) {
      throw new NotFoundException('Badge not found for this user');
    }

    userBadge.isVisible = isVisible;
    return this.userBadgeRepository.save(userBadge);
  }

  async getAchievementStats(profileId: string): Promise<AchievementStatsDto> {
    const badges = await this.userBadgeRepository.find({
      where: { profileId },
      relations: ['badge'],
      order: { awardedAt: 'DESC' },
    });

    const badgesByCategory = {
      achievement: 0,
      learning: 0,
      participation: 0,
      skill: 0,
      milestone: 0,
    };

    let rareBadgesCount = 0;

    badges.forEach((ub) => {
      badgesByCategory[ub.badge.category]++;
      if (ub.badge.rarity >= 4) {
        rareBadgesCount++;
      }
    });

    const recentBadges = badges
      .slice(0, 5)
      .map((ub) => this.mapBadgeToResponseDto(ub.badge));

    return {
      totalBadgesEarned: badges.length,
      totalBadgesAvailable: await this.badgeRepository.count(),
      badgesByCategory,
      rareBadgesCount,
      recentBadges,
      nextBadgeProgress: {
        badgeName: 'Next Achievement',
        progress: 0,
        target: 0,
      },
    };
  }

  async getLeaderboard(
    limit: number = 10,
    offset: number = 0,
  ): Promise<LeaderboardDto[]> {
    const profiles = await this.profileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect(
        'profile.badges',
        'badge',
      )
      .orderBy('profile.badgesCount', 'DESC')
      .addOrderBy('profile.followersCount', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    return profiles.map((profile, index) => ({
      rank: offset + index + 1,
      userId: profile.userId,
      firstName: profile.user?.firstName || 'User',
      lastName: profile.user?.lastName || '',
      profilePhotoUrl: profile.profilePhotoUrl,
      totalBadges: profile.badgesCount,
      score: profile.badgesCount * 10 + profile.followersCount,
      recentAchievements: profile.badges.filter(
        (b) =>
          new Date(b.awardedAt).getTime() >
          Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).length,
    }));
  }

  async searchBadges(query: string): Promise<BadgeResponseDto[]> {
    const badges = await this.badgeRepository
      .createQueryBuilder('badge')
      .where('badge.isActive = true')
      .andWhere(
        '(badge.name ILIKE :query OR badge.description ILIKE :query)',
        { query: `%${query}%` },
      )
      .orderBy('badge.rarity', 'DESC')
      .getMany();

    return badges.map((badge) => this.mapBadgeToResponseDto(badge));
  }

  private mapBadgeToResponseDto(badge: Badge): BadgeResponseDto {
    return {
      id: badge.id,
      name: badge.name,
      description: badge.description,
      iconUrl: badge.iconUrl,
      category: badge.category,
      rarity: badge.rarity,
      unlockedCriteria: badge.unlockedCriteria,
      totalAwarded: badge.totalAwarded,
      isActive: badge.isActive,
      createdAt: badge.createdAt,
      updatedAt: badge.updatedAt,
    };
  }
}
