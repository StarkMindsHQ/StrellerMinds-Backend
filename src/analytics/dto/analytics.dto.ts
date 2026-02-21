import { IsString, IsEnum, IsOptional, IsArray, IsObject, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ReportType } from '../entities/analytics-report.entity';

export class DateRangeDto {
  @ApiProperty()
  @IsDateString()
  start: string;

  @ApiProperty()
  @IsDateString()
  end: string;
}

export class ReportConfigurationDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  metrics: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  dimensions: string[];

  @ApiProperty({ type: 'object' })
  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;

  @ApiProperty({ type: DateRangeDto })
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange: DateRangeDto;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  groupBy?: string[];

  @ApiProperty({ type: 'object', required: false })
  @IsArray()
  @IsOptional()
  orderBy?: { field: string; direction: 'ASC' | 'DESC' }[];
}

export class CreateReportDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiProperty({ type: ReportConfigurationDto })
  @ValidateNested()
  @Type(() => ReportConfigurationDto)
  configuration: ReportConfigurationDto;
}

export class ExportReportDto {
  @ApiProperty({ enum: ['csv', 'xlsx', 'pdf', 'json'] })
  @IsEnum(['csv', 'xlsx', 'pdf', 'json'])
  format: 'csv' | 'xlsx' | 'pdf' | 'json';
}

export class DashboardQueryDto {
  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  metric?: string;
}
