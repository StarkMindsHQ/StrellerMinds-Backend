import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, Type } from 'class-validator';

export class FollowUserDto {
  @IsString()
  userId: string;
}

export class FollowResponseDto {
  id: string;
  followerId: string;
  followingId: string;
  status: 'follow' | 'block' | 'mute';
  isNotified: boolean;
  createdAt: Date;
}

export class SocialGraphResponseDto {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string;
  headline: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isFollowedBy: boolean;
  isBlocked: boolean;
  createdAt: Date;
}

export class UserNetworkDto {
  followers: SocialGraphResponseDto[];
  following: SocialGraphResponseDto[];
  mutualConnections: SocialGraphResponseDto[];
  suggestedUsers: SocialGraphResponseDto[];
}

export class BlockUserDto {
  @IsString()
  userId: string;
}

export class MuteUserDto {
  @IsString()
  userId: string;
}

export class SocialStatsDto {
  followersCount: number;
  followingCount: number;
  mutualConnectionsCount: number;
  blockedCount: number;
  mutedCount: number;
}
