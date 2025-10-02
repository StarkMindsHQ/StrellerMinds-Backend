import { IsEnum, IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';
import { ReportFormat, ReportType } from '../interfaces/analytics.interface';

export class GenerateReportDto {
  @IsEnum(ReportType)
  reportType: ReportType;

  @IsEnum(ReportFormat)
  format: ReportFormat;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsUUID()
  instructorId?: string;

  @IsOptional()
  @IsString()
  title?: string;
}
