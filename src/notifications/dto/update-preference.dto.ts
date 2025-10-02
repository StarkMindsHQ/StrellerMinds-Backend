import { IsBoolean, IsOptional, IsObject } from 'class-validator';
import type { NotificationChannel, NotificationType } from '../entities/notification.entity';

export class UpdateNotificationPreferenceDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsObject()
  typePreferences?: { [key in NotificationType]?: NotificationChannel[] };
}
