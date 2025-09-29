/**
 * Enum for selecting a time range in analytics queries.
 */
export enum TimeRange {
  LAST_7_DAYS = "last_7_days",
  LAST_30_DAYS = "last_30_days",
  LAST_90_DAYS = "last_90_days",
  LAST_YEAR = "last_year",
  CUSTOM = "custom",
}

/**
 * Enum for export format options.
 */
export enum ExportFormat {
  JSON = "json",
  CSV = "csv",
  EXCEL = "excel",
}

import { IsOptional, IsDateString, IsEnum, IsUUID, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for querying analytics dashboard data with filters and pagination.
 */
export class AnalyticsQueryDto {
  /** Time range for analytics query */
  @ApiPropertyOptional({ enum: TimeRange, description: 'Time range for analytics query', default: TimeRange.LAST_30_DAYS })
  @IsOptional()
  @IsEnum(TimeRange)
  timeRange?: TimeRange = TimeRange.LAST_30_DAYS;

  /** Custom start date (ISO8601) */
  @ApiPropertyOptional({ description: 'Custom start date (ISO8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /** Custom end date (ISO8601) */
  @ApiPropertyOptional({ description: 'Custom end date (ISO8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  /** Filter by course ID */
  @ApiPropertyOptional({ description: 'Filter by course ID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  /** Filter by instructor ID */
  @ApiPropertyOptional({ description: 'Filter by instructor ID' })
  @IsOptional()
  @IsUUID()
  instructorId?: string;

  /** Number of results per page (default: 20) */
  @ApiPropertyOptional({ minimum: 1, maximum: 100, description: 'Number of results per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  /** Offset for pagination (default: 0) */
  @ApiPropertyOptional({ minimum: 0, description: 'Offset for pagination', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

/**
 * DTO for exporting analytics data with specified format and filters.
 */
export class ExportQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: ExportFormat, description: 'Format for exporting data', default: ExportFormat.JSON })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.JSON;
}
