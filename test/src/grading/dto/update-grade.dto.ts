/**
 * DTO for updating a grade (partial fields allowed).
 */
import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGradeDto {
  /** Updated numeric grade (optional). */
  @ApiPropertyOptional({ example: 90, description: 'Updated numeric grade.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  numericGrade?: number;

  /** Updated feedback after reassessment (optional). */
  @ApiPropertyOptional({ example: 'Updated feedback after reassessment.' })
  @IsOptional()
  @IsString()
  feedback?: string;
}
