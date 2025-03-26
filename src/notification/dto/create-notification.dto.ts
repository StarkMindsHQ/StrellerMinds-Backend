import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsUUID()
  userId: string;
}
