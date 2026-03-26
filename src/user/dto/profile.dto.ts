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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({ description: 'Short biography or about me section', example: 'Blockchain enthusiast and educator.' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  bio?: string;

  @ApiPropertyOptional({ description: 'A catchy headline for the profile', example: 'Lead Developer | Stellar Expert' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  headline?: string;

  @ApiPropertyOptional({ description: 'URL to the profile photo', example: 'https://cdn.example.com/photos/user123.jpg' })
  @IsOptional()
  @IsUrl()
  profilePhotoUrl?: string;

  @ApiPropertyOptional({ description: 'URL to the cover photo', example: 'https://cdn.example.com/covers/user123.jpg' })
  @IsOptional()
  @IsUrl()
  coverPhotoUrl?: string;

  @ApiPropertyOptional({ description: 'Physical location or timezone', example: 'Lagos, Nigeria' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  location?: string;

  @ApiPropertyOptional({ description: 'Personal or business website URL', example: 'https://johndoe.com' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ description: 'Comma-separated list of skills', example: 'Stellar, Typescript, Rust, DeFi' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  skills?: string;

  @ApiPropertyOptional({ description: 'Area of professional specialization', example: 'Smart Contract Auditing' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  specialization?: string;

  @ApiPropertyOptional({ description: 'Years of professional experience', example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  yearsOfExperience?: number;

  @ApiPropertyOptional({ description: 'Educational background', example: 'B.Sc. Computer Science' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  education?: string;

  @ApiPropertyOptional({
    description: 'Links to social media profiles',
    example: { twitter: '@johndoe', linkedin: 'linkedin.com/in/johndoe' }
  })
  @IsOptional()
  @IsObject()
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    [key: string]: string | undefined;
  };

  @ApiPropertyOptional({
    description: 'Custom UI theme preferences',
    example: { primaryColor: '#0070f3', layout: 'grid' }
  })
  @IsOptional()
  @IsObject()
  theme?: {
    primaryColor?: string;
    accentColor?: string;
    layout?: 'grid' | 'list' | 'minimal';
  };

  @ApiPropertyOptional({ description: 'Whether to show achievements/badges on profile', default: true })
  @IsOptional()
  showBadges?: boolean;

  @ApiPropertyOptional({ description: 'Whether to show the portfolio on profile', default: true })
  @IsOptional()
  showPortfolio?: boolean;

  @ApiPropertyOptional({ description: 'Whether to show recent activity on profile', default: true })
  @IsOptional()
  showActivity?: boolean;
}

export class UserProfileResponseDto {
  @ApiProperty({ example: 'uuid-v4-string' })
  id: string;

  @ApiProperty({ example: 'user-uuid' })
  userId: string;

  @ApiProperty({ example: 'Blockchain enthusiast.' })
  bio: string;

  @ApiProperty({ example: 'Full Stack Developer' })
  headline: string;

  @ApiProperty({ example: 'https://example.com/photo.jpg' })
  profilePhotoUrl: string;

  @ApiProperty({ example: 'https://example.com/cover.jpg' })
  coverPhotoUrl: string;

  @ApiProperty({ example: 'Lagos, Nigeria' })
  location: string;

  @ApiProperty({ example: 'https://johndoe.com' })
  website: string;

  @ApiProperty({ example: 'Stellar, Typescript' })
  skills: string;

  @ApiProperty({ example: 'DeFi' })
  specialization: string;

  @ApiProperty({ example: 5 })
  yearsOfExperience: number;

  @ApiProperty({ example: 'B.Sc. Computer Science' })
  education: string;

  @ApiProperty({ example: { twitter: '@johndoe' } })
  socialLinks: Record<string, string>;

  @ApiProperty({ example: { primaryColor: '#000000' } })
  theme: Record<string, unknown>;

  @ApiProperty({ default: true })
  showBadges: boolean;

  @ApiProperty({ default: true })
  showPortfolio: boolean;

  @ApiProperty({ default: true })
  showActivity: boolean;

  @ApiProperty({ example: 120 })
  followersCount: number;

  @ApiProperty({ example: 45 })
  followingCount: number;

  @ApiProperty({ example: 12 })
  portfolioItemsCount: number;

  @ApiProperty({ example: 8 })
  badgesCount: number;

  @ApiProperty({ example: 1540 })
  profileViews: number;

  @ApiProperty({ default: false })
  isVerified: boolean;

  @ApiProperty({ example: 'Incomplete' })
  completionStatus: string;

  @ApiProperty({ example: 85 })
  completionPercentage: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CreatePortfolioItemDto {
  @ApiProperty({ description: 'Title of the portfolio item', example: 'Stellar Wallet Project' })
  @IsString()
  @Length(1, 255)
  title: string;

  @ApiPropertyOptional({ description: 'Detailed description of the project or achievement', example: 'Built a non-custodial wallet for Stellar.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Category of the item',
    enum: ['project', 'certificate', 'achievement', 'publication', 'course'],
    example: 'project'
  })
  @IsString()
  type: 'project' | 'certificate' | 'achievement' | 'publication' | 'course';

  @ApiPropertyOptional({ description: 'Markdown or plain text content', example: 'Full case study of the project...' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'URL to a preview image', example: 'https://example.com/preview.jpg' })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'URL to the live project', example: 'https://wallet.stellar.org' })
  @IsOptional()
  @IsUrl()
  projectUrl?: string;

  @ApiPropertyOptional({ description: 'URL to the source code repository', example: 'https://github.com/stellar/wallet' })
  @IsOptional()
  @IsUrl()
  repositoryUrl?: string;

  @ApiPropertyOptional({ description: 'URL to the digital certificate', example: 'https://verify.example.com/cert/123' })
  @IsOptional()
  @IsUrl()
  certificateUrl?: string;

  @ApiPropertyOptional({ description: 'List of technologies used', example: ['Stellar SDK', 'React', 'Node.js'], type: [String] })
  @IsOptional()
  @IsArray()
  technologies?: string[];

  @ApiPropertyOptional({ description: 'Search tags', example: ['DeFi', 'Open Source'], type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ example: '2023-01-01T00:00:00Z' })
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({ example: '2023-06-01T00:00:00Z' })
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Mark as a featured project', default: false })
  @IsOptional()
  isFeatured?: boolean;
}

export class UpdatePortfolioItemDto {
  @ApiPropertyOptional({ description: 'Title of the portfolio item', example: 'Stellar Wallet Project' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  title?: string;

  @ApiPropertyOptional({ description: 'Detailed description', example: 'Updated description...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['project', 'certificate', 'achievement', 'publication', 'course'] })
  @IsOptional()
  @IsString()
  type?: 'project' | 'certificate' | 'achievement' | 'publication' | 'course';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  projectUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  repositoryUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  certificateUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  technologies?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  displayOrder?: number;
}

export class PortfolioItemResponseDto {
  @ApiProperty({ example: 'uuid-v4-string' })
  id: string;

  @ApiProperty({ example: 'profile-uuid' })
  profileId: string;

  @ApiProperty({ example: 'Project Title' })
  title: string;

  @ApiProperty({ example: 'Description' })
  description: string;

  @ApiProperty({ enum: ['project', 'certificate', 'achievement', 'publication', 'course'] })
  type: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  imageUrl: string;

  @ApiProperty()
  projectUrl: string;

  @ApiProperty()
  repositoryUrl: string;

  @ApiProperty()
  certificateUrl: string;

  @ApiProperty({ type: [String] })
  technologies: string[];

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  isFeatured: boolean;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  isPublic: boolean;

  @ApiProperty()
  displayOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class UserBadgeResponseDto {
  @ApiProperty({ example: 'uuid-v4-string' })
  id: string;

  @ApiProperty({ example: 'profile-uuid' })
  profileId: string;

  @ApiProperty({ example: 'badge-uuid' })
  badgeId: string;

  @ApiProperty({ example: 'Stellar Pioneer' })
  name: string;

  @ApiProperty({ example: 'Awarded for completing the first path.' })
  description: string;

  @ApiProperty({ example: 'https://cdn.example.com/icons/badge.png' })
  iconUrl: string;

  @ApiProperty({ example: 'Educational' })
  category: string;

  @ApiProperty({ example: 0.1 })
  rarity: number;

  @ApiProperty({ example: 'Completed Stellar Foundation course' })
  unlockedReason: string;

  @ApiProperty({ default: true })
  isVisible: boolean;

  @ApiProperty({ example: 1 })
  level: number;

  @ApiProperty()
  awardedAt: Date;
}

export class ProfileAnalyticsResponseDto {
  @ApiProperty({ example: 'uuid-v4-string' })
  id: string;

  @ApiProperty({ example: 'profile-uuid' })
  profileId: string;

  @ApiProperty({ example: 1000 })
  totalViews: number;

  @ApiProperty({ example: 25 })
  viewsToday: number;

  @ApiProperty({ example: 150 })
  viewsThisWeek: number;

  @ApiProperty({ example: 600 })
  viewsThisMonth: number;

  @ApiProperty({ example: 50 })
  totalFollowsGained: number;

  @ApiProperty({ example: 5 })
  totalFollowsLost: number;

  @ApiProperty({ example: 450 })
  portfolioItemsViews: number;

  @ApiProperty({ example: 120 })
  portfolioItemsClicks: number;

  @ApiProperty({ example: 800 })
  badgesDisplays: number;

  @ApiProperty({ example: { direct: 40, search: 30, social: 30 } })
  trafficSources: Record<string, number>;

  @ApiProperty({ example: { mobile: 60, desktop: 40 } })
  deviceTypes: Record<string, number>;

  @ApiProperty({ example: { US: 30, NG: 20, DE: 10 } })
  topCountries: Record<string, number>;

  @ApiProperty({ example: 120, description: 'Average session duration in seconds' })
  averageSessionDuration: number;

  @ApiProperty()
  lastViewedAt: Date;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  recentViewers: Array<{
    userId?: string;
    timestamp: Date;
    referrer?: string;
  }>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class UserProfileWithDetailsDto extends UserProfileResponseDto {
  @ApiProperty({ type: [PortfolioItemResponseDto] })
  portfolioItems?: PortfolioItemResponseDto[];

  @ApiProperty({ type: [UserBadgeResponseDto] })
  badges?: UserBadgeResponseDto[];

  @ApiProperty({ type: () => ProfileAnalyticsResponseDto })
  analytics?: ProfileAnalyticsResponseDto;
}
