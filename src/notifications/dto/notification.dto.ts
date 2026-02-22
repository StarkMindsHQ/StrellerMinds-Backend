import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsObject,
  IsBoolean,
  IsDateString,
  IsUUID,
  MinLength,
  MaxLength,
  IsUrl,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationChannel, NotificationType } from '../entities/notification-preference.entity';
import { NotificationPriority } from '../entities/notifications.entity';

export class CreateNotificationDto {
  @IsUUID()
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(1)
  body: string;

  @IsString()
  @IsOptional()
  templateKey?: string;

  @IsObject()
  @IsOptional()
  templateData?: Record<string, any>;

  @IsString()
  @IsOptional()
  @IsIn(['en', 'es', 'fr', 'de', 'pt', 'ja', 'zh', 'ar'])
  locale?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsUrl()
  @IsOptional()
  actionUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  actionLabel?: string;

  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  @IsOptional()
  channels?: NotificationChannel[];

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class BulkCreateNotificationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNotificationDto)
  notifications: CreateNotificationDto[];
}

export class UpdatePreferencesDto {
  @IsObject()
  @IsOptional()
  channelPreferences?: Record<NotificationChannel, { enabled: boolean; types: NotificationType[] }>;

  @IsString()
  @IsOptional()
  digestFrequency?: string;

  @IsString()
  @IsOptional()
  digestTime?: string;

  @IsString()
  @IsOptional()
  digestTimezone?: string;

  @IsBoolean()
  @IsOptional()
  emailEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  pushEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  websocketEnabled?: boolean;

  @IsString()
  @IsOptional()
  preferredLocale?: string;

  @IsArray()
  @IsEnum(NotificationType, { each: true })
  @IsOptional()
  mutedTypes?: NotificationType[];

  @IsBoolean()
  @IsOptional()
  doNotDisturbEnabled?: boolean;

  @IsString()
  @IsOptional()
  doNotDisturbStart?: string;

  @IsString()
  @IsOptional()
  doNotDisturbEnd?: string;
}

export class RegisterPushTokenDto {
  @IsString()
  @MinLength(10)
  token: string;

  @IsIn(['ios', 'android', 'web'])
  platform: 'ios' | 'android' | 'web';

  @IsString()
  @MinLength(1)
  deviceId: string;
}

export class NotificationQueryDto {
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 20;
}
