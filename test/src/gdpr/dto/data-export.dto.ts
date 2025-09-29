import { IsOptional, IsArray, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

/**
 * Enum for export format options.
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  XML = 'xml',
}

/**
 * DTO for requesting a data export.
 */
export class DataExportRequestDto {
  /** Data types to export (optional) */
  @ApiPropertyOptional({ description: 'Data types to export', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dataTypes?: string[];

  /** Export format (optional) */
  @ApiPropertyOptional({ enum: ExportFormat, description: 'Export format', default: ExportFormat.JSON })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.JSON;

  /** Reason for export (optional) */
  @ApiPropertyOptional({ description: 'Reason for export' })
  @IsOptional()
  @IsString()
  reason?: string;
}
