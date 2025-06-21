import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsString, IsUUID, IsEnum, IsArray, IsOptional, IsObject, IsBoolean } from "class-validator"
import { NotificationType, NotificationPriority } from "../entities/notification.entity"



export enum NotificationPlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
  ALL = 'all'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high'
}

export class CreateNotificationDto {
    quietHoursStart: any
    quietHoursEnd: any
    body: any
    platform(platform: any) {
        throw new Error('Method not implemented.')
    }
  @ApiProperty({ description: "User ID to send notification to" })
  @IsUUID()
  userId: string

  @ApiProperty({ description: "Notification title" })
  @IsString()
  title: string

  @ApiProperty({ description: "Notification content" })
  @IsString()
  content: string

  @ApiProperty({
    description: "Notification types",
    enum: NotificationType,
    isArray: true,
    default: [NotificationType.IN_APP],
  })
  @IsEnum(NotificationType, { each: true })
  @IsArray()
  types: NotificationType[]

  @ApiProperty({ description: "Notification category" })
  @IsString()
  category: string

  @ApiPropertyOptional({
    description: "Notification priority",
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority

  @ApiPropertyOptional({ description: "Additional metadata for the notification" })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>

  @ApiPropertyOptional({ description: "Whether to send notification immediately" })
  @IsBoolean()
  @IsOptional()
  sendImmediately?: boolean
    scheduledAt: any
}

export class CreatePushNotificationDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  clickAction?: string;

  @IsEnum(NotificationPlatform)
  platform: NotificationPlatform;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority = NotificationPriority.NORMAL;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deviceTokens?: string[];

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsBoolean()
  silent?: boolean;
}
