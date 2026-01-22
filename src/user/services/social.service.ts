import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follow } from '../entities/follow.entity';
import { UserProfile } from '../entities/user-profile.entity';
import {
  FollowResponseDto,
  SocialGraphResponseDto,
  UserNetworkDto,
  SocialStatsDto,
} from '../dto/social.dto';
import { User } from '../../auth/entities/user.entity';

@Injectable()
export class SocialService {
  constructor(
    @InjectRepository(Follow)
    private followRepository: Repository<Follow>,
    @InjectRepository(UserProfile)
    private profileRepository: Repository<UserProfile>,
  ) {}

  async followUser(followerId: string, followingId: string): Promise<FollowResponseDto> {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const followerProfile = await this.profileRepository.findOne({
      where: { id: followerId },
    });

    const followingProfile = await this.profileRepository.findOne({
      where: { id: followingId },
    });

    if (!followerProfile || !followingProfile) {
      throw new NotFoundException('Profile not found');
    }

    // Check if already following
    const existing = await this.followRepository.findOne({
      where: { followerId, followingId, status: 'follow' },
    });

    if (existing) {
      return this.mapToResponseDto(existing);
    }

    // Check if blocked
    const blocked = await this.followRepository.findOne({
      where: { followerId, followingId, status: 'block' },
    });

    if (blocked) {
      throw new BadRequestException('Cannot follow a blocked user');
    }

    const follow = this.followRepository.create({
      followerId,
      followingId,
      status: 'follow',
    });

    const saved = await this.followRepository.save(follow);

    // Update counts
    followerProfile.followingCount++;
    followingProfile.followersCount++;

    await Promise.all([
      this.profileRepository.save(followerProfile),
      this.profileRepository.save(followingProfile),
    ]);

    return this.mapToResponseDto(saved);
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId, status: 'follow' },
    });

    if (!follow) {
      throw new NotFoundException('Not following this user');
    }

    await this.followRepository.remove(follow);

    // Update counts
    const [followerProfile, followingProfile] = await Promise.all([
      this.profileRepository.findOne({ where: { id: followerId } }),
      this.profileRepository.findOne({ where: { id: followingId } }),
    ]);

    if (followerProfile && followerProfile.followingCount > 0) {
      followerProfile.followingCount--;
      await this.profileRepository.save(followerProfile);
    }

    if (followingProfile && followingProfile.followersCount > 0) {
      followingProfile.followersCount--;
      await this.profileRepository.save(followingProfile);
    }
  }

  async blockUser(blockerId: string, blockedId: string): Promise<FollowResponseDto> {
    if (blockerId === blockedId) {
      throw new BadRequestException('Cannot block yourself');
    }

    // Remove any existing follow relationship
    await this.followRepository.delete({
      followerId: blockerId,
      followingId: blockedId,
    });

    // Remove follower relationship
    await this.followRepository.delete({
      followerId: blockedId,
      followingId: blockerId,
    });

    // Create block relationship
    let block = await this.followRepository.findOne({
      where: { followerId: blockerId, followingId: blockedId },
    });

    if (!block) {
      block = this.followRepository.create({
        followerId: blockerId,
        followingId: blockedId,
        status: 'block',
      });
      block = await this.followRepository.save(block);
    } else {
      block.status = 'block';
      block = await this.followRepository.save(block);
    }

    return this.mapToResponseDto(block);
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const block = await this.followRepository.findOne({
      where: { followerId: blockerId, followingId: blockedId, status: 'block' },
    });

    if (!block) {
      throw new NotFoundException('User is not blocked');
    }

    await this.followRepository.remove(block);
  }

  async muteUser(muterId: string, mutedId: string): Promise<FollowResponseDto> {
    if (muterId === mutedId) {
      throw new BadRequestException('Cannot mute yourself');
    }

    let mute = await this.followRepository.findOne({
      where: { followerId: muterId, followingId: mutedId },
    });

    if (!mute) {
      mute = this.followRepository.create({
        followerId: muterId,
        followingId: mutedId,
        status: 'mute',
      });
    } else {
      mute.status = 'mute';
    }

    const saved = await this.followRepository.save(mute);
    return this.mapToResponseDto(saved);
  }

  async unmuteUser(muterId: string, mutedId: string): Promise<void> {
    const mute = await this.followRepository.findOne({
      where: { followerId: muterId, followingId: mutedId, status: 'mute' },
    });

    if (!mute) {
      throw new NotFoundException('User is not muted');
    }

    await this.followRepository.remove(mute);
  }

  async getFollowers(profileId: string): Promise<SocialGraphResponseDto[]> {
    const follows = await this.followRepository.find({
      where: { followingId: profileId, status: 'follow' },
      relations: ['follower', 'follower.user'],
    });

    return follows.map((f) => this.mapProfileToSocialGraphDto(f.follower, f.follower.user));
  }

  async getFollowing(profileId: string): Promise<SocialGraphResponseDto[]> {
    const follows = await this.followRepository.find({
      where: { followerId: profileId, status: 'follow' },
      relations: ['following', 'following.user'],
    });

    return follows.map((f) => this.mapProfileToSocialGraphDto(f.following, f.following.user));
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId, status: 'follow' },
    });

    return !!follow;
  }

  async isFollowedBy(userId: string, followerId: string): Promise<boolean> {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId: userId, status: 'follow' },
    });

    return !!follow;
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await this.followRepository.findOne({
      where: { followerId: blockerId, followingId: blockedId, status: 'block' },
    });

    return !!block;
  }

  async getMutualConnections(
    profileId1: string,
    profileId2: string,
  ): Promise<SocialGraphResponseDto[]> {
    const following1 = await this.followRepository.find({
      where: { followerId: profileId1, status: 'follow' },
    });

    const following2Ids = (
      await this.followRepository.find({
        where: { followerId: profileId2, status: 'follow' },
      })
    ).map((f) => f.followingId);

    const mutual = following1.filter((f) => following2Ids.includes(f.followingId));

    const profiles = await Promise.all(
      mutual.map((m) =>
        this.profileRepository.findOne({
          where: { id: m.followingId },
          relations: ['user'],
        }),
      ),
    );

    return profiles
      .filter((p) => p !== null)
      .map((p) => this.mapProfileToSocialGraphDto(p, p.user));
  }

  async getUserNetwork(
    profileId: string,
    limit: number = 10,
  ): Promise<UserNetworkDto> {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const [followers, following] = await Promise.all([
      this.getFollowers(profileId),
      this.getFollowing(profileId),
    ]);

    const suggestedUsers = await this.getSuggestedUsers(profileId, limit);

    const followingIds = following.map((f) => f.id);
    const mutualConnections = followers.filter((f) =>
      followingIds.includes(f.id),
    );

    return {
      followers: followers.slice(0, limit),
      following: following.slice(0, limit),
      mutualConnections: mutualConnections.slice(0, limit),
      suggestedUsers,
    };
  }

  async getSuggestedUsers(
    profileId: string,
    limit: number = 10,
  ): Promise<SocialGraphResponseDto[]> {
    const following = await this.followRepository.find({
      where: { followerId: profileId, status: 'follow' },
    });

    const followingIds = following.map((f) => f.followingId);
    followingIds.push(profileId);

    // Get users followed by people we follow
    const suggestedFollows = await this.followRepository
      .createQueryBuilder('follow')
      .where('follow.followerId IN (:...ids)', { ids: followingIds })
      .andWhere('follow.followingId NOT IN (:...excludeIds)', {
        excludeIds: followingIds,
      })
      .andWhere('follow.status = :status', { status: 'follow' })
      .groupBy('follow.followingId')
      .orderBy('COUNT(*)', 'DESC')
      .take(limit)
      .getMany();

    const profiles = await Promise.all(
      suggestedFollows.map((sf) =>
        this.profileRepository.findOne({
          where: { id: sf.followingId },
          relations: ['user'],
        }),
      ),
    );

    return profiles
      .filter((p) => p !== null)
      .map((p) => this.mapProfileToSocialGraphDto(p, p.user));
  }

  async getSocialStats(profileId: string): Promise<SocialStatsDto> {
    const [followers, following, blocked, muted] = await Promise.all([
      this.followRepository.count({
        where: { followingId: profileId, status: 'follow' },
      }),
      this.followRepository.count({
        where: { followerId: profileId, status: 'follow' },
      }),
      this.followRepository.count({
        where: { followerId: profileId, status: 'block' },
      }),
      this.followRepository.count({
        where: { followerId: profileId, status: 'mute' },
      }),
    ]);

    const mutual = await this.getMutualConnections(profileId, profileId);

    return {
      followersCount: followers,
      followingCount: following,
      mutualConnectionsCount: mutual.length,
      blockedCount: blocked,
      mutedCount: muted,
    };
  }

  private mapToResponseDto(follow: Follow): FollowResponseDto {
    return {
      id: follow.id,
      followerId: follow.followerId,
      followingId: follow.followingId,
      status: follow.status,
      isNotified: follow.isNotified,
      createdAt: follow.createdAt,
    };
  }

  private mapProfileToSocialGraphDto(
    profile: UserProfile,
    user: User,
  ): SocialGraphResponseDto {
    return {
      id: profile.id,
      userId: profile.userId,
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      profilePhotoUrl: profile.profilePhotoUrl,
      headline: profile.headline,
      bio: profile.bio,
      followersCount: profile.followersCount,
      followingCount: profile.followingCount,
      isFollowing: false, // Will be determined by caller if needed
      isFollowedBy: false, // Will be determined by caller if needed
      isBlocked: false, // Will be determined by caller if needed
      createdAt: profile.createdAt,
    };
  }
}
