import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdatePrivacySettingsDto {
  @IsOptional()
  @IsString()
  profileVisibility?: 'public' | 'private' | 'friends-only';

  @IsOptional()
  @IsString()
  portfolioVisibility?: 'public' | 'private' | 'friends-only';

  @IsOptional()
  @IsString()
  badgesVisibility?: 'public' | 'private' | 'friends-only';

  @IsOptional()
  @IsString()
  activityVisibility?: 'public' | 'private' | 'friends-only';

  @IsOptional()
  @IsBoolean()
  allowMessaging?: boolean;

  @IsOptional()
  @IsBoolean()
  allowFollowing?: boolean;

  @IsOptional()
  @IsBoolean()
  allowMentions?: boolean;

  @IsOptional()
  @IsBoolean()
  showInSearch?: boolean;

  @IsOptional()
  @IsBoolean()
  showInRecommendations?: boolean;

  @IsOptional()
  @IsBoolean()
  shareActivityFeed?: boolean;

  @IsOptional()
  @IsBoolean()
  shareAnalytics?: boolean;

  @IsOptional()
  @IsBoolean()
  allowThirdPartyIntegrations?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;
}

export class PrivacySettingsResponseDto {
  id: string;
  profileId: string;
  profileVisibility: string;
  portfolioVisibility: string;
  badgesVisibility: string;
  activityVisibility: string;
  allowMessaging: boolean;
  allowFollowing: boolean;
  allowMentions: boolean;
  showInSearch: boolean;
  showInRecommendations: boolean;
  shareActivityFeed: boolean;
  shareAnalytics: boolean;
  allowThirdPartyIntegrations: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  blockedUsers: string[];
  mutedUsers: string[];
  customPrivacy: Record<string, string>;
  dataRetentionDays: number;
  autoDeleteInactivity: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class DataExportDto {
  format: 'json' | 'csv' | 'pdf';
  includePortfolio: boolean;
  includeBadges: boolean;
  includeAnalytics: boolean;
  includeSocialGraph: boolean;
  includeMessages: boolean;
}

export class DataExportResponseDto {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: string;
  fileUrl: string;
  createdAt: Date;
  expiresAt: Date;
}

export class DeleteAccountDto {
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
