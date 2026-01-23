import { IsString, IsOptional, IsObject } from 'class-validator';

export class TrackEventDto {
  @IsString()
  event: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
