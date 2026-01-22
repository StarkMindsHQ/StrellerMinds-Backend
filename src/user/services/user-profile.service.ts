import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from '../entities/user-profile.entity';
import { ProfileAnalytics } from '../entities/profile-analytics.entity';
import {
  UpdateUserProfileDto,
  UserProfileResponseDto,
  UserProfileWithDetailsDto,
} from '../dto/profile.dto';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectRepository(UserProfile)
    private profileRepository: Repository<UserProfile>,
    @InjectRepository(ProfileAnalytics)
    private analyticsRepository: Repository<ProfileAnalytics>,
  ) {}

  async createProfile(userId: string): Promise<UserProfile> {
    const profile = this.profileRepository.create({
      userId,
      completionPercentage: 0,
      completionStatus: 'incomplete',
    });

    const savedProfile = await this.profileRepository.save(profile);

    // Create associated analytics
    await this.analyticsRepository.create({
      profileId: savedProfile.id,
    });
    await this.analyticsRepository.save({
      profileId: savedProfile.id,
    });

    return savedProfile;
  }

  async getProfileByUserId(userId: string): Promise<UserProfile> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: ['portfolioItems', 'badges', 'badges.badge', 'privacySettings'],
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    return profile;
  }

  async getProfileById(profileId: string): Promise<UserProfile> {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
      relations: ['portfolioItems', 'badges', 'badges.badge', 'privacySettings'],
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async updateProfile(
    userId: string,
    updateDto: UpdateUserProfileDto,
  ): Promise<UserProfileResponseDto> {
    const profile = await this.getProfileByUserId(userId);

    Object.assign(profile, updateDto);

    // Calculate completion percentage
    profile.completionPercentage = this.calculateCompletionPercentage(profile);
    profile.completionStatus = this.getCompletionStatus(profile.completionPercentage);

    await this.profileRepository.save(profile);

    return this.mapToResponseDto(profile);
  }

  async getProfileWithDetails(userId: string): Promise<UserProfileWithDetailsDto> {
    const profile = await this.getProfileByUserId(userId);
    const analytics = await this.analyticsRepository.findOne({
      where: { profileId: profile.id },
    });

    return {
      ...this.mapToResponseDto(profile),
      portfolioItems: profile.portfolioItems.map((item) => ({
        id: item.id,
        profileId: item.profileId,
        title: item.title,
        description: item.description,
        type: item.type,
        content: item.content,
        imageUrl: item.imageUrl,
        projectUrl: item.projectUrl,
        repositoryUrl: item.repositoryUrl,
        certificateUrl: item.certificateUrl,
        technologies: item.technologies,
        tags: item.tags,
        startDate: item.startDate,
        endDate: item.endDate,
        isFeatured: item.isFeatured,
        viewCount: item.viewCount,
        likeCount: item.likeCount,
        isPublic: item.isPublic,
        displayOrder: item.displayOrder,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      badges: profile.badges.map((ub) => ({
        id: ub.id,
        profileId: ub.profileId,
        badgeId: ub.badgeId,
        name: ub.badge.name,
        description: ub.badge.description,
        iconUrl: ub.badge.iconUrl,
        category: ub.badge.category,
        rarity: ub.badge.rarity,
        unlockedReason: ub.unlockedReason,
        isVisible: ub.isVisible,
        level: ub.level,
        awardedAt: ub.awardedAt,
      })),
      analytics: analytics ? {
        id: analytics.id,
        profileId: analytics.profileId,
        totalViews: analytics.totalViews,
        viewsToday: analytics.viewsToday,
        viewsThisWeek: analytics.viewsThisWeek,
        viewsThisMonth: analytics.viewsThisMonth,
        totalFollowsGained: analytics.totalFollowsGained,
        totalFollowsLost: analytics.totalFollowsLost,
        portfolioItemsViews: analytics.portfolioItemsViews,
        portfolioItemsClicks: analytics.portfolioItemsClicks,
        badgesDisplays: analytics.badgesDisplays,
        trafficSources: analytics.trafficSources,
        deviceTypes: analytics.deviceTypes,
        topCountries: analytics.topCountries,
        averageSessionDuration: analytics.averageSessionDuration,
        lastViewedAt: analytics.lastViewedAt,
        recentViewers: analytics.recentViewers,
        createdAt: analytics.createdAt,
        updatedAt: analytics.updatedAt,
      } : undefined,
    };
  }

  async trackProfileView(profileId: string, referrer?: string): Promise<void> {
    const profile = await this.profileRepository.findOne({ where: { id: profileId } });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    profile.profileViews++;
    await this.profileRepository.save(profile);

    const analytics = await this.analyticsRepository.findOne({
      where: { profileId },
    });

    if (analytics) {
      analytics.totalViews++;
      analytics.viewsToday++;
      analytics.viewsThisWeek++;
      analytics.viewsThisMonth++;
      analytics.lastViewedAt = new Date();

      // Track referrer
      if (referrer) {
        if (!analytics.recentViewers) {
          analytics.recentViewers = [];
        }
        analytics.recentViewers.push({
          timestamp: new Date(),
          referrer,
        });

        // Keep only last 100 viewers
        if (analytics.recentViewers.length > 100) {
          analytics.recentViewers = analytics.recentViewers.slice(-100);
        }
      }

      await this.analyticsRepository.save(analytics);
    }
  }

  async getAnalytics(userId: string): Promise<ProfileAnalytics> {
    const profile = await this.getProfileByUserId(userId);
    const analytics = await this.analyticsRepository.findOne({
      where: { profileId: profile.id },
    });

    if (!analytics) {
      throw new NotFoundException('Analytics not found');
    }

    return analytics;
  }

  async resetDailyStats(profileId: string): Promise<void> {
    const analytics = await this.analyticsRepository.findOne({
      where: { profileId },
    });

    if (analytics) {
      analytics.viewsToday = 0;
      await this.analyticsRepository.save(analytics);
    }
  }

  private calculateCompletionPercentage(profile: UserProfile): number {
    let completedFields = 0;
    const totalFields = 10;

    if (profile.bio) completedFields++;
    if (profile.headline) completedFields++;
    if (profile.profilePhotoUrl) completedFields++;
    if (profile.location) completedFields++;
    if (profile.skills) completedFields++;
    if (profile.specialization) completedFields++;
    if (profile.website) completedFields++;
    if (profile.yearsOfExperience) completedFields++;
    if (profile.education) completedFields++;
    if (profile.socialLinks && Object.keys(profile.socialLinks).length > 0)
      completedFields++;

    return Math.round((completedFields / totalFields) * 100);
  }

  private getCompletionStatus(
    percentage: number,
  ): 'incomplete' | 'partial' | 'complete' {
    if (percentage === 0) return 'incomplete';
    if (percentage === 100) return 'complete';
    return 'partial';
  }

  private mapToResponseDto(profile: UserProfile): UserProfileResponseDto {
    return {
      id: profile.id,
      userId: profile.userId,
      bio: profile.bio,
      headline: profile.headline,
      profilePhotoUrl: profile.profilePhotoUrl,
      coverPhotoUrl: profile.coverPhotoUrl,
      location: profile.location,
      website: profile.website,
      skills: profile.skills,
      specialization: profile.specialization,
      yearsOfExperience: profile.yearsOfExperience,
      education: profile.education,
      socialLinks: profile.socialLinks || {},
      theme: profile.theme || {},
      showBadges: profile.showBadges,
      showPortfolio: profile.showPortfolio,
      showActivity: profile.showActivity,
      followersCount: profile.followersCount,
      followingCount: profile.followingCount,
      portfolioItemsCount: profile.portfolioItemsCount,
      badgesCount: profile.badgesCount,
      profileViews: profile.profileViews,
      isVerified: profile.isVerified,
      completionStatus: profile.completionStatus,
      completionPercentage: profile.completionPercentage,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
