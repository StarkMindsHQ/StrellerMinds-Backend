import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { UserProfile } from '../entities/user-profile.entity';
import { UserSkill } from '../entities/user-skill.entity';
import { Follow } from '../entities/follow.entity';
import { PrivacySettings } from '../entities/privacy-settings.entity';

export interface ProfileRecommendation {
  profileId: string;
  userId: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string;
  headline: string;
  bio: string;
  skills: string[];
  mutualConnections: number;
  skillOverlap: number;
  score: number;
  reason: string;
}

export interface ContentRecommendation {
  type: 'portfolio' | 'skill' | 'course';
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  authorId?: string;
  authorName?: string;
  score: number;
  reason: string;
}

@Injectable()
export class RecommendationService {
  constructor(
    @InjectRepository(UserProfile)
    private profileRepository: Repository<UserProfile>,
    @InjectRepository(UserSkill)
    private userSkillRepository: Repository<UserSkill>,
    @InjectRepository(Follow)
    private followRepository: Repository<Follow>,
    @InjectRepository(PrivacySettings)
    private privacyRepository: Repository<PrivacySettings>,
  ) {}

  /**
   * Get profile recommendations for a user based on multiple factors
   */
  async getProfileRecommendations(
    profileId: string,
    limit: number = 10,
  ): Promise<ProfileRecommendation[]> {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
      relations: ['userSkills', 'userSkills.skill'],
    });

    if (!profile) {
      return [];
    }

    // Get user's skills
    const userSkillIds = profile.userSkills?.map((us) => us.skillId) || [];

    // Get existing connections
    const existingConnections = await this.followRepository.find({
      where: [{ followerId: profileId }, { followingId: profileId }],
    });
    const connectedIds = existingConnections.map((c) =>
      c.followerId === profileId ? c.followingId : c.followerId,
    );
    connectedIds.push(profileId); // Exclude self

    // Find profiles with similar skills
    const similarProfiles = await this.userSkillRepository
      .createQueryBuilder('userSkill')
      .select('userSkill.profileId', 'profileId')
      .addSelect('COUNT(DISTINCT userSkill.skillId)', 'skillOverlap')
      .where('userSkill.skillId IN (:...skillIds)', {
        skillIds: userSkillIds.length > 0 ? userSkillIds : [''],
      })
      .andWhere('userSkill.profileId NOT IN (:...excludeIds)', {
        excludeIds: connectedIds.length > 0 ? connectedIds : [''],
      })
      .andWhere('userSkill.isPublic = :isPublic', { isPublic: true })
      .groupBy('userSkill.profileId')
      .having('COUNT(DISTINCT userSkill.skillId) > 0')
      .orderBy('skillOverlap', 'DESC')
      .limit(limit * 2)
      .getRawMany();

    const candidateProfileIds = similarProfiles.map((p) => p.profileId);

    if (candidateProfileIds.length === 0) {
      return this.getPopularProfiles(profileId, limit);
    }

    // Get full profile details
    const candidateProfiles = await this.profileRepository.find({
      where: { id: In(candidateProfileIds) },
      relations: ['user', 'userSkills', 'userSkills.skill'],
    });

    // Filter by privacy settings
    const visibleProfiles = await this.filterByPrivacy(candidateProfiles);

    // Calculate mutual connections
    const recommendations: ProfileRecommendation[] = await Promise.all(
      visibleProfiles.map(async (candidate) => {
        const mutualConnections = await this.getMutualConnectionsCount(profileId, candidate.id);
        const skillOverlap =
          similarProfiles.find((p) => p.profileId === candidate.id)?.skillOverlap || 0;

        // Calculate recommendation score
        const score = this.calculateRecommendationScore(skillOverlap, mutualConnections, candidate);

        return {
          profileId: candidate.id,
          userId: candidate.userId,
          firstName: candidate.user?.firstName || '',
          lastName: candidate.user?.lastName || '',
          profilePhotoUrl: candidate.profilePhotoUrl,
          headline: candidate.headline,
          bio: candidate.bio,
          skills: candidate.userSkills?.map((us) => us.skill?.name).filter(Boolean) || [],
          mutualConnections,
          skillOverlap,
          score,
          reason: this.getRecommendationReason(skillOverlap, mutualConnections),
        };
      }),
    );

    // Sort by score and return top recommendations
    return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Get content recommendations based on user interests
   */
  async getContentRecommendations(
    profileId: string,
    limit: number = 10,
  ): Promise<ContentRecommendation[]> {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
      relations: ['userSkills', 'userSkills.skill', 'portfolioItems'],
    });

    if (!profile) {
      return [];
    }

    const recommendations: ContentRecommendation[] = [];

    // Get portfolio recommendations from similar users
    const portfolioRecommendations = await this.getPortfolioRecommendations(profile);
    recommendations.push(...portfolioRecommendations);

    // Get skill recommendations
    const skillRecommendations = await this.getSkillRecommendations(profile);
    recommendations.push(...skillRecommendations);

    // Sort by score and return
    return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Get trending profiles
   */
  async getTrendingProfiles(limit: number = 10): Promise<ProfileRecommendation[]> {
    const trendingProfiles = await this.profileRepository
      .createQueryBuilder('profile')
      .where('profile.isVerified = :isVerified', { isVerified: true })
      .andWhere('profile.profileViews > :minViews', { minViews: 100 })
      .orderBy('profile.profileViews', 'DESC')
      .addOrderBy('profile.followersCount', 'DESC')
      .limit(limit * 2)
      .getMany();

    const visibleProfiles = await this.filterByPrivacy(trendingProfiles);

    return Promise.all(
      visibleProfiles.slice(0, limit).map(async (profile) => ({
        profileId: profile.id,
        userId: profile.userId,
        firstName: '', // Will be populated if needed
        lastName: '',
        profilePhotoUrl: profile.profilePhotoUrl,
        headline: profile.headline,
        bio: profile.bio,
        skills: [],
        mutualConnections: 0,
        skillOverlap: 0,
        score: profile.profileViews + profile.followersCount * 10,
        reason: 'Trending profile',
      })),
    );
  }

  /**
   * Get "People You May Know" recommendations
   */
  async getPeopleYouMayKnow(
    profileId: string,
    limit: number = 10,
  ): Promise<ProfileRecommendation[]> {
    // Get 2nd degree connections
    const following = await this.followRepository.find({
      where: { followerId: profileId, status: 'follow' },
    });

    const followingIds = following.map((f) => f.followingId);

    if (followingIds.length === 0) {
      return this.getPopularProfiles(profileId, limit);
    }

    // Get people followed by people I follow (2nd degree)
    const secondDegree = await this.followRepository
      .createQueryBuilder('follow')
      .select('follow.followingId', 'profileId')
      .addSelect('COUNT(*)', 'connectionCount')
      .where('follow.followerId IN (:...followingIds)', { followingIds })
      .andWhere('follow.followingId != :profileId', { profileId })
      .andWhere('follow.status = :status', { status: 'follow' })
      .groupBy('follow.followingId')
      .orderBy('connectionCount', 'DESC')
      .limit(limit * 2)
      .getRawMany();

    // Filter out existing connections
    const existingConnections = await this.followRepository.find({
      where: { followerId: profileId },
    });
    const existingIds = existingConnections.map((c) => c.followingId);

    const candidateIds = secondDegree
      .map((s) => s.profileId)
      .filter((id) => !existingIds.includes(id));

    if (candidateIds.length === 0) {
      return this.getPopularProfiles(profileId, limit);
    }

    const profiles = await this.profileRepository.find({
      where: { id: In(candidateIds) },
      relations: ['user', 'userSkills', 'userSkills.skill'],
    });

    const visibleProfiles = await this.filterByPrivacy(profiles);

    return Promise.all(
      visibleProfiles.slice(0, limit).map(async (profile) => {
        const connectionCount =
          secondDegree.find((s) => s.profileId === profile.id)?.connectionCount || 0;
        return {
          profileId: profile.id,
          userId: profile.userId,
          firstName: profile.user?.firstName || '',
          lastName: profile.user?.lastName || '',
          profilePhotoUrl: profile.profilePhotoUrl,
          headline: profile.headline,
          bio: profile.bio,
          skills: profile.userSkills?.map((us) => us.skill?.name).filter(Boolean) || [],
          mutualConnections: connectionCount,
          skillOverlap: 0,
          score: connectionCount * 10,
          reason: `${connectionCount} mutual connection${connectionCount > 1 ? 's' : ''}`,
        };
      }),
    );
  }

  // Private helper methods

  private async getPopularProfiles(
    excludeProfileId: string,
    limit: number,
  ): Promise<ProfileRecommendation[]> {
    const profiles = await this.profileRepository.find({
      where: { id: Not(excludeProfileId) },
      order: {
        followersCount: 'DESC',
        profileViews: 'DESC',
      },
      take: limit * 2,
    });

    const visibleProfiles = await this.filterByPrivacy(profiles);

    return visibleProfiles.slice(0, limit).map((profile) => ({
      profileId: profile.id,
      userId: profile.userId,
      firstName: '',
      lastName: '',
      profilePhotoUrl: profile.profilePhotoUrl,
      headline: profile.headline,
      bio: profile.bio,
      skills: [],
      mutualConnections: 0,
      skillOverlap: 0,
      score: profile.followersCount,
      reason: 'Popular profile',
    }));
  }

  private async filterByPrivacy(profiles: UserProfile[]): Promise<UserProfile[]> {
    const privacySettings = await this.privacyRepository.find({
      where: { profileId: In(profiles.map((p) => p.id)) },
    });

    const privacyMap = new Map(privacySettings.map((p) => [p.profileId, p]));

    return profiles.filter((profile) => {
      const privacy = privacyMap.get(profile.id);
      if (!privacy) return true;
      return privacy.profileVisibility === 'public' && privacy.showInRecommendations;
    });
  }

  private async getMutualConnectionsCount(profileId1: string, profileId2: string): Promise<number> {
    const [following1, following2] = await Promise.all([
      this.followRepository.find({
        where: { followerId: profileId1, status: 'follow' },
      }),
      this.followRepository.find({
        where: { followerId: profileId2, status: 'follow' },
      }),
    ]);

    const following1Ids = new Set(following1.map((f) => f.followingId));
    const following2Ids = following2.map((f) => f.followingId);

    return following2Ids.filter((id) => following1Ids.has(id)).length;
  }

  private calculateRecommendationScore(
    skillOverlap: number,
    mutualConnections: number,
    profile: UserProfile,
  ): number {
    let score = 0;

    // Skill overlap weight
    score += skillOverlap * 15;

    // Mutual connections weight
    score += mutualConnections * 10;

    // Profile completeness bonus
    if (profile.completionPercentage >= 80) score += 10;

    // Verified profile bonus
    if (profile.isVerified) score += 5;

    // Activity bonus
    score += Math.min(profile.profileViews / 100, 10);

    return score;
  }

  private getRecommendationReason(skillOverlap: number, mutualConnections: number): string {
    if (skillOverlap > 0 && mutualConnections > 0) {
      return `Similar skills and ${mutualConnections} mutual connection${mutualConnections > 1 ? 's' : ''}`;
    } else if (skillOverlap > 0) {
      return `${skillOverlap} skill${skillOverlap > 1 ? 's' : ''} in common`;
    } else if (mutualConnections > 0) {
      return `${mutualConnections} mutual connection${mutualConnections > 1 ? 's' : ''}`;
    }
    return 'Recommended for you';
  }

  private async getPortfolioRecommendations(
    profile: UserProfile,
  ): Promise<ContentRecommendation[]> {
    // Get portfolio items from users with similar skills
    const userSkillIds = profile.userSkills?.map((us) => us.skillId) || [];

    if (userSkillIds.length === 0) return [];

    const similarUserSkills = await this.userSkillRepository.find({
      where: {
        skillId: In(userSkillIds),
        profileId: Not(profile.id),
      },
      relations: ['profile', 'profile.portfolioItems'],
    });

    const recommendations: ContentRecommendation[] = [];
    const seenItems = new Set<string>();

    for (const userSkill of similarUserSkills) {
      if (userSkill.profile?.portfolioItems) {
        for (const item of userSkill.profile.portfolioItems) {
          if (!seenItems.has(item.id) && item.isPublic) {
            seenItems.add(item.id);
            recommendations.push({
              type: 'portfolio',
              id: item.id,
              title: item.title,
              description: item.description || '',
              imageUrl: item.imageUrl,
              authorId: userSkill.profileId,
              score: 50,
              reason: 'From someone with similar skills',
            });
          }
        }
      }
    }

    return recommendations;
  }

  private async getSkillRecommendations(profile: UserProfile): Promise<ContentRecommendation[]> {
    // Get related skills based on user's current skills
    const userSkillIds = profile.userSkills?.map((us) => us.skillId) || [];

    if (userSkillIds.length === 0) return [];

    const userSkills = await this.userSkillRepository.find({
      where: { profileId: profile.id },
      relations: ['skill'],
    });

    const relatedSkillIds: string[] = [];
    for (const userSkill of userSkills) {
      if (userSkill.skill?.relatedSkills) {
        relatedSkillIds.push(...userSkill.skill.relatedSkills);
      }
    }

    // Filter out skills user already has
    const newSkillIds = relatedSkillIds.filter((id) => !userSkillIds.includes(id));

    if (newSkillIds.length === 0) return [];
  }
}
