import { IsString, IsBoolean, IsOptional, IsObject, IsEnum, IsArray } from 'class-validator';
import { NotificationChannel, NotificationType } from '../entities/notification-preference.entity';

export class CreateNotificationPreferenceDto {
  @IsString()
  userId: string;

  @IsObject()
  @IsOptional()
  preferences?: Record<NotificationType, {
    channels: NotificationChannel[];
    enabled: boolean;
    frequency?: 'immediate' | 'daily' | 'weekly' | 'never';
  }>;

  @IsBoolean()
  @IsOptional()
  emailEnabled?: boolean = true;

  @IsBoolean()
  @IsOptional()
  smsEnabled?: boolean = true;

  @IsBoolean()
  @IsOptional()
  pushEnabled?: boolean = true;

  @IsBoolean()
  @IsOptional()
  inAppEnabled?: boolean = true;
}

export class UpdateNotificationPreferenceDto {
  @IsObject()
  @IsOptional()
  preferences?: Record<NotificationType, {
    channels: NotificationChannel[];
    enabled: boolean;
    frequency?: 'immediate' | 'daily' | 'weekly' | 'never';
  }>;

  @IsBoolean()
  @IsOptional()
  emailEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  smsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  pushEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  inAppEnabled?: boolean;
}

export class UnsubscribeDto {
  @IsString()
  token: string;

  @IsArray()
  @IsOptional()
  categories?: string[];
}