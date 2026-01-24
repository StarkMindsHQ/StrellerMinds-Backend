import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateBadgeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  iconUrl?: string;

  @IsString()
  category: 'achievement' | 'learning' | 'participation' | 'skill' | 'milestone';

  @IsOptional()
  unlockedCriteria?: string;
}

export class BadgeResponseDto {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: string;
  rarity: number;
  unlockedCriteria: string;
  totalAwarded: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class AwardBadgeDto {
  @IsString()
  badgeId: string;

  @IsOptional()
  @IsString()
  unlockedReason?: string;
}

export class AchievementStatsDto {
  totalBadgesEarned: number;
  totalBadgesAvailable: number;
  badgesByCategory: {
    achievement: number;
    learning: number;
    participation: number;
    skill: number;
    milestone: number;
  };
  rareBadgesCount: number;
  recentBadges: BadgeResponseDto[];
  nextBadgeProgress: {
    badgeName: string;
    progress: number;
    target: number;
  };
}

export class LeaderboardDto {
  rank: number;
  userId: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string;
  totalBadges: number;
  score: number; // Weighted score
  recentAchievements: number;
}
