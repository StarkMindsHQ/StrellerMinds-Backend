import { IsOptional, IsArray, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a deletion request.
 */
export class CreateDeletionRequestDto {
  /** Reason for deletion (optional) */
  @ApiPropertyOptional({ description: 'Reason for deletion' })
  @IsOptional()
  @IsString()
  reason?: string;

  /** Data types to delete (optional) */
  @ApiPropertyOptional({ description: 'Data types to delete', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dataTypes?: string[];

  /** Scheduled deletion date (optional) */
  @ApiPropertyOptional({
    description: 'Scheduled deletion date',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
