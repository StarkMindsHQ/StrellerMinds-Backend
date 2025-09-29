/**
 * DTO for updating user progress in a course or lesson
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max, IsObject } from 'class-validator';

export class UpdateProgressDto {
  @ApiProperty({ example: 50, minimum: 0, maximum: 100, description: 'Progress percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage: number;

  @ApiPropertyOptional({ type: 'object', description: 'Additional metadata for progress' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}