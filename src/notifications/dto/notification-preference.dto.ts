import { IsString, IsBoolean, IsOptional, IsObject, IsEnum, IsArray } from 'class-validator';
import { NotificationChannel, NotificationType } from '../entities/notification-preference.entity';

export class CreateNotificationPreferenceDto {
  @IsString()
  userId: string;

  @IsObject()
  @IsOptional()
  preferences?: Partial<Record<NotificationType, {
    channels: NotificationChannel[];
    enabled: boolean;
    frequency?: 'immediate' | 'daily' | 'weekly' | 'never';
  }>>;

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

  @IsBoolean()
  @IsOptional()
  quietHoursEnabled?: boolean = false;

  @IsString()
  @IsOptional()
  quietHoursStart?: string;

  @IsString()
  @IsOptional()
  quietHoursEnd?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsBoolean()
  @IsOptional()
  doNotDisturb?: boolean = false;
}

export class UpdateNotificationPreferenceDto {
  @IsObject()
  @IsOptional()
  preferences?: Partial<Record<NotificationType, {
    channels: NotificationChannel[];
    enabled: boolean;
    frequency?: 'immediate' | 'daily' | 'weekly' | 'never';
  }>>;

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

  @IsBoolean()
  @IsOptional()
  quietHoursEnabled?: boolean;

  @IsString()
  @IsOptional()
  quietHoursStart?: string;

  @IsString()
  @IsOptional()
  quietHoursEnd?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsBoolean()
  @IsOptional()
  doNotDisturb?: boolean;
}

export class UnsubscribeDto {
  @IsString()
  token: string;

  @IsArray()
  @IsOptional()
  categories?: string[];
}