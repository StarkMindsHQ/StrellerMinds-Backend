import { IsBoolean, IsOptional, IsString, IsObject } from 'class-validator';

export class CreateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsString()
  frequency?: 'immediate' | 'daily' | 'weekly';

  @IsOptional()
  @IsObject()
  rules?: Record<string, any>;
}
