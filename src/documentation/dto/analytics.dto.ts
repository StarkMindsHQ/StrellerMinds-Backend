import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { HttpMethod } from '../entities/api-usage.entity';

export class ApiAnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'API Key ID' })
  @IsOptional()
  @IsString()
  apiKeyId?: string;

  @ApiPropertyOptional({ description: 'Endpoint path' })
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional({ enum: HttpMethod })
  @IsOptional()
  @IsEnum(HttpMethod)
  method?: HttpMethod;

  @ApiPropertyOptional({ description: 'Status code' })
  @IsOptional()
  @IsString()
  statusCode?: string;
}

export class ApiAnalyticsResponseDto {
  totalRequests: number;
  uniqueApiKeys: number;
  averageResponseTime: number;
  errorRate: number;
  requestsByEndpoint: Array<{
    endpoint: string;
    method: string;
    count: number;
    averageResponseTime: number;
    errorCount: number;
  }>;
  requestsByStatus: Record<string, number>;
  requestsOverTime: Array<{
    timestamp: Date;
    count: number;
    averageResponseTime: number;
  }>;
  topApiKeys: Array<{
    apiKeyId: string;
    name: string;
    requestCount: number;
  }>;
}
