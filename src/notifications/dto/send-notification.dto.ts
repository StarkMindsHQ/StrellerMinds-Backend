import { IsString, IsEnum, IsOptional, IsObject, IsUUID, IsDateString } from 'class-validator';
import { NotificationChannel, NotificationType } from '../entities/notification-preference.entity';

export class SendNotificationDto {
  @IsUUID()
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsEnum(NotificationChannel, { each: true })
  @IsOptional()
  preferredChannels?: NotificationChannel[];

  @IsDateString()
  @IsOptional()
  scheduledAt?: Date;

  @IsOptional()
  priority?: 'high' | 'normal' | 'low' = 'normal';
}
