import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { NotificationChannel, NotificationType } from '../entities/notification.entity';

export class NotificationAnalyticsQueryDto {
  @IsOptional()
  @IsEnum(NotificationType)
  notificationType?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
