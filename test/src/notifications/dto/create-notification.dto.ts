import { IsUUID, IsString, IsNotEmpty, IsOptional, IsEnum, IsArray } from "class-validator"
import { Type } from "class-transformer"
import { NotificationChannel, NotificationType } from "../entities/notification.entity"

export class CreateNotificationDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string

  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType

  @IsString()
  @IsNotEmpty()
  message: string

  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[] // If not provided, use user preferences

  @IsOptional()
  @IsNotEmpty()
  @Type(() => Object) // Ensure it's treated as an object for validation
  data?: Record<string, any> // e.g., { courseId: 'uuid', link: '/course/123' }
}
