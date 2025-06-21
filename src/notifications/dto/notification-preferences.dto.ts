import { IsBoolean, IsOptional, IsArray, IsString } from 'class-validator';

export class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  courseUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  assignments?: boolean;

  @IsOptional()
  @IsBoolean()
  announcements?: boolean;

  @IsOptional()
  @IsBoolean()
  achievements?: boolean;

  @IsOptional()
  @IsBoolean()
  reminders?: boolean;

  @IsOptional()
  @IsBoolean()
  marketing?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mutedTopics?: string[];

  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  quietHoursEnd?: string;
}
