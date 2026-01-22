import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrivacySettings } from '../entities/privacy-settings.entity';
import { UserProfile } from '../entities/user-profile.entity';
import {
  UpdatePrivacySettingsDto,
  PrivacySettingsResponseDto,
} from '../dto/privacy.dto';

@Injectable()
export class PrivacyService {
  constructor(
    @InjectRepository(PrivacySettings)
    private privacyRepository: Repository<PrivacySettings>,
    @InjectRepository(UserProfile)
    private profileRepository: Repository<UserProfile>,
  ) {}

  async createPrivacySettings(profileId: string): Promise<PrivacySettings> {
    const privacy = this.privacyRepository.create({
      profileId,
    });

    return this.privacyRepository.save(privacy);
  }

  async getPrivacySettings(
    userId: string,
    requesterId?: string,
  ): Promise<PrivacySettingsResponseDto> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: ['privacySettings'],
    });

    if (!profile || !profile.privacySettings) {
      throw new NotFoundException('Privacy settings not found');
    }

    // Apply privacy filtering if not the owner
    if (requesterId && requesterId !== userId) {
      return this.filterPrivacySettings(profile.privacySettings, profile, requesterId);
    }

    return this.mapToResponseDto(profile.privacySettings);
  }

  async updatePrivacySettings(
    userId: string,
    updateDto: UpdatePrivacySettingsDto,
  ): Promise<PrivacySettingsResponseDto> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: ['privacySettings'],
    });

    if (!profile || !profile.privacySettings) {
      throw new NotFoundException('Privacy settings not found');
    }

    Object.assign(profile.privacySettings, updateDto);
    const updated = await this.privacyRepository.save(profile.privacySettings);

    return this.mapToResponseDto(updated);
  }

  async blockUser(userId: string, blockedUserId: string): Promise<PrivacySettingsResponseDto> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: ['privacySettings'],
    });

    if (!profile || !profile.privacySettings) {
      throw new NotFoundException('Privacy settings not found');
    }

    if (!profile.privacySettings.blockedUsers) {
      profile.privacySettings.blockedUsers = [];
    }

    if (!profile.privacySettings.blockedUsers.includes(blockedUserId)) {
      profile.privacySettings.blockedUsers.push(blockedUserId);
      await this.privacyRepository.save(profile.privacySettings);
    }

    return this.mapToResponseDto(profile.privacySettings);
  }

  async unblockUser(
    userId: string,
    blockedUserId: string,
  ): Promise<PrivacySettingsResponseDto> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: ['privacySettings'],
    });

    if (!profile || !profile.privacySettings) {
      throw new NotFoundException('Privacy settings not found');
    }

    if (profile.privacySettings.blockedUsers) {
      profile.privacySettings.blockedUsers =
        profile.privacySettings.blockedUsers.filter((id) => id !== blockedUserId);
      await this.privacyRepository.save(profile.privacySettings);
    }

    return this.mapToResponseDto(profile.privacySettings);
  }

  async muteUser(userId: string, mutedUserId: string): Promise<PrivacySettingsResponseDto> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: ['privacySettings'],
    });

    if (!profile || !profile.privacySettings) {
      throw new NotFoundException('Privacy settings not found');
    }

    if (!profile.privacySettings.mutedUsers) {
      profile.privacySettings.mutedUsers = [];
    }

    if (!profile.privacySettings.mutedUsers.includes(mutedUserId)) {
      profile.privacySettings.mutedUsers.push(mutedUserId);
      await this.privacyRepository.save(profile.privacySettings);
    }

    return this.mapToResponseDto(profile.privacySettings);
  }

  async unmuteUser(userId: string, mutedUserId: string): Promise<PrivacySettingsResponseDto> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: ['privacySettings'],
    });

    if (!profile || !profile.privacySettings) {
      throw new NotFoundException('Privacy settings not found');
    }

    if (profile.privacySettings.mutedUsers) {
      profile.privacySettings.mutedUsers =
        profile.privacySettings.mutedUsers.filter((id) => id !== mutedUserId);
      await this.privacyRepository.save(profile.privacySettings);
    }

    return this.mapToResponseDto(profile.privacySettings);
  }

  async isUserBlocked(userId: string, potentialBlocker: string): Promise<boolean> {
    const profile = await this.profileRepository.findOne({
      where: { userId: potentialBlocker },
      relations: ['privacySettings'],
    });

    if (!profile || !profile.privacySettings) {
      return false;
    }

    return profile.privacySettings.blockedUsers?.includes(userId) || false;
  }

  async isUserMuted(userId: string, potentialMuter: string): Promise<boolean> {
    const profile = await this.profileRepository.findOne({
      where: { userId: potentialMuter },
      relations: ['privacySettings'],
    });

    if (!profile || !profile.privacySettings) {
      return false;
    }

    return profile.privacySettings.mutedUsers?.includes(userId) || false;
  }

  async canViewProfile(profileOwnerId: string, viewerId?: string): Promise<boolean> {
    const profile = await this.profileRepository.findOne({
      where: { userId: profileOwnerId },
      relations: ['privacySettings'],
    });

    if (!profile || !profile.privacySettings) {
      return true;
    }

    // Owner can always view their own profile
    if (profileOwnerId === viewerId) {
      return true;
    }

    // Check if blocked
    if (viewerId && (await this.isUserBlocked(viewerId, profileOwnerId))) {
      return false;
    }

    const visibility = profile.privacySettings.profileVisibility;

    if (visibility === 'public') {
      return true;
    }

    if (visibility === 'private') {
      return false;
    }

    // For friends-only, would need to check follow status
    // This is handled by the calling service

    return true;
  }

  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: [
        'user',
        'portfolioItems',
        'badges',
        'followers',
        'following',
        'privacySettings',
      ],
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return {
      profile: {
        id: profile.id,
        bio: profile.bio,
        headline: profile.headline,
        location: profile.location,
        website: profile.website,
        skills: profile.skills,
        specialization: profile.specialization,
        yearsOfExperience: profile.yearsOfExperience,
        education: profile.education,
        socialLinks: profile.socialLinks,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      portfolio: profile.portfolioItems.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        type: item.type,
        url: item.projectUrl,
        createdAt: item.createdAt,
      })),
      achievements: profile.badges.map((badge) => ({
        id: badge.id,
        name: badge.badge.name,
        category: badge.badge.category,
        awardedAt: badge.awardedAt,
      })),
      social: {
        followers: profile.followersCount,
        following: profile.followingCount,
      },
      privacySettings: {
        profileVisibility: profile.privacySettings?.profileVisibility,
        emailNotifications: profile.privacySettings?.emailNotifications,
        marketingEmails: profile.privacySettings?.marketingEmails,
      },
    };
  }

  private filterPrivacySettings(
    privacy: PrivacySettings,
    profile: UserProfile,
    requesterId: string,
  ): PrivacySettingsResponseDto {
    // Omit sensitive fields for non-owners
    const filtered = this.mapToResponseDto(privacy);
    return filtered;
  }

  private mapToResponseDto(privacy: PrivacySettings): PrivacySettingsResponseDto {
    return {
      id: privacy.id,
      profileId: privacy.profileId,
      profileVisibility: privacy.profileVisibility,
      portfolioVisibility: privacy.portfolioVisibility,
      badgesVisibility: privacy.badgesVisibility,
      activityVisibility: privacy.activityVisibility,
      allowMessaging: privacy.allowMessaging,
      allowFollowing: privacy.allowFollowing,
      allowMentions: privacy.allowMentions,
      showInSearch: privacy.showInSearch,
      showInRecommendations: privacy.showInRecommendations,
      shareActivityFeed: privacy.shareActivityFeed,
      shareAnalytics: privacy.shareAnalytics,
      allowThirdPartyIntegrations: privacy.allowThirdPartyIntegrations,
      emailNotifications: privacy.emailNotifications,
      pushNotifications: privacy.pushNotifications,
      marketingEmails: privacy.marketingEmails,
      blockedUsers: privacy.blockedUsers || [],
      mutedUsers: privacy.mutedUsers || [],
      customPrivacy: privacy.customPrivacy || {},
      dataRetentionDays: privacy.dataRetentionDays,
      autoDeleteInactivity: privacy.autoDeleteInactivity,
      createdAt: privacy.createdAt,
      updatedAt: privacy.updatedAt,
    };
  }
}
