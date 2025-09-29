import { IsOptional, IsString, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateNotificationSettingsDto } from './create-notification-settings.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating or updating user preferences.
 */
export class CreateUserPreferencesDto {
  /** Learning customization options */
  @ApiPropertyOptional({
    description: 'Learning customization options',
    type: 'object',
    example: {
      preferredTopics: ['math', 'science'],
      learningPace: 'medium',
      learningGoals: 'Finish algebra course',
    },
  })
  @IsOptional()
  @IsObject()
  learningCustomization?: {
    preferredTopics?: string[];
    learningPace?: 'slow' | 'medium' | 'fast';
    learningGoals?: string;
  };

  /** Notification settings */
  @ApiPropertyOptional({
    description: 'Notification settings',
    type: () => CreateNotificationSettingsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateNotificationSettingsDto)
  notificationSettings?: CreateNotificationSettingsDto;

  /** Personalization data */
  @ApiPropertyOptional({
    description: 'Personalization data',
    type: 'object',
    example: {
      theme: 'dark',
      language: 'en',
      accessibility: ['high-contrast'],
    },
  })
  @IsOptional()
  @IsObject()
  personalizationData?: {
    theme?: string;
    language?: string;
    accessibility?: string[];
  };
}