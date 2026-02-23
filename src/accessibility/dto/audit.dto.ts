import { IsString, IsOptional, IsEnum, IsUrl, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditType } from '../entities/accessibility-audit.entity';

export class CreateAuditDto {
  @ApiProperty({ description: 'URL to audit' })
  @IsUrl()
  url: string;

  @ApiProperty({ description: 'HTML content to audit' })
  @IsString()
  html: string;

  @ApiPropertyOptional({ description: 'Optional CSS content for focus/visibility checks' })
  @IsOptional()
  @IsString()
  css?: string;

  @ApiPropertyOptional({ description: 'Expected language code for localization checks', default: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ enum: AuditType, default: AuditType.FULL_AUDIT })
  @IsOptional()
  @IsEnum(AuditType)
  type?: AuditType;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AuditHistoryQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Limit results', default: 50 })
  @IsOptional()
  limit?: number;
}
