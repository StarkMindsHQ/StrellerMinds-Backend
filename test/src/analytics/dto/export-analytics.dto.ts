import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for analytics data export query parameters.
 */
export class ExportAnalyticsDto {
  @ApiPropertyOptional({
    description: 'Export format: csv or json (default)',
    enum: ['csv', 'json'],
  })
  @IsOptional()
  @IsIn(['csv', 'json'], { message: 'validation.format.invalid' })
  format?: string;
}
