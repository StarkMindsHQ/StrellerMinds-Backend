import { IsDateString, IsOptional } from 'class-validator';

export class AnalyticsQueryDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsOptional()
  groupBy?: 'day' | 'week' | 'month';
}
