import {
  IsString,
  IsOptional,
  IsEmail,
  IsUrl,
  Length,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  @Length(0, 500)
  bio?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  headline?: string;

  @IsOptional()
  @IsUrl()
  profilePhotoUrl?: string;

  @IsOptional()
  @IsUrl()
  coverPhotoUrl?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  location?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  skills?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  specialization?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  yearsOfExperience?: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  education?: string;

  @IsOptional()
  @IsObject()
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    [key: string]: string | undefined;
  };

  @IsOptional()
  @IsObject()
  theme?: {
    primaryColor?: string;
    accentColor?: string;
    layout?: 'grid' | 'list' | 'minimal';
  };

  @IsOptional()
  showBadges?: boolean;

  @IsOptional()
  showPortfolio?: boolean;

  @IsOptional()
  showActivity?: boolean;
}

export class UserProfileResponseDto {
  id: string;
  userId: string;
  bio: string;
  headline: string;
  profilePhotoUrl: string;
  coverPhotoUrl: string;
  location: string;
  website: string;
  skills: string;
  specialization: string;
  yearsOfExperience: number;
  education: string;
  socialLinks: Record<string, string>;
  theme: Record<string, unknown>;
  showBadges: boolean;
  showPortfolio: boolean;
  showActivity: boolean;
  followersCount: number;
  followingCount: number;
  portfolioItemsCount: number;
  badgesCount: number;
  profileViews: number;
  isVerified: boolean;
  completionStatus: string;
  completionPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export class UserProfileWithDetailsDto extends UserProfileResponseDto {
  portfolioItems?: PortfolioItemResponseDto[];
  badges?: UserBadgeResponseDto[];
  analytics?: ProfileAnalyticsResponseDto;
}

export class CreatePortfolioItemDto {
  @IsString()
  @Length(1, 255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  type: 'project' | 'certificate' | 'achievement' | 'publication' | 'course';

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsUrl()
  projectUrl?: string;

  @IsOptional()
  @IsUrl()
  repositoryUrl?: string;

  @IsOptional()
  @IsUrl()
  certificateUrl?: string;

  @IsOptional()
  @IsArray()
  technologies?: string[];

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  startDate?: Date;

  @IsOptional()
  endDate?: Date;

  @IsOptional()
  isFeatured?: boolean;
}

export class UpdatePortfolioItemDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: 'project' | 'certificate' | 'achievement' | 'publication' | 'course';

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsUrl()
  projectUrl?: string;

  @IsOptional()
  @IsUrl()
  repositoryUrl?: string;

  @IsOptional()
  @IsUrl()
  certificateUrl?: string;

  @IsOptional()
  @IsArray()
  technologies?: string[];

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  startDate?: Date;

  @IsOptional()
  endDate?: Date;

  @IsOptional()
  isFeatured?: boolean;

  @IsOptional()
  isPublic?: boolean;

  @IsOptional()
  displayOrder?: number;
}

export class PortfolioItemResponseDto {
  id: string;
  profileId: string;
  title: string;
  description: string;
  type: string;
  content: string;
  imageUrl: string;
  projectUrl: string;
  repositoryUrl: string;
  certificateUrl: string;
  technologies: string[];
  tags: string[];
  startDate: Date;
  endDate: Date;
  isFeatured: boolean;
  viewCount: number;
  likeCount: number;
  isPublic: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export class UserBadgeResponseDto {
  id: string;
  profileId: string;
  badgeId: string;
  name: string;
  description: string;
  iconUrl: string;
  category: string;
  rarity: number;
  unlockedReason: string;
  isVisible: boolean;
  level: number;
  awardedAt: Date;
}

export class ProfileAnalyticsResponseDto {
  id: string;
  profileId: string;
  totalViews: number;
  viewsToday: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
  totalFollowsGained: number;
  totalFollowsLost: number;
  portfolioItemsViews: number;
  portfolioItemsClicks: number;
  badgesDisplays: number;
  trafficSources: Record<string, number>;
  deviceTypes: Record<string, number>;
  topCountries: Record<string, number>;
  averageSessionDuration: number;
  lastViewedAt: Date;
  recentViewers: Array<{
    userId?: string;
    timestamp: Date;
    referrer?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
