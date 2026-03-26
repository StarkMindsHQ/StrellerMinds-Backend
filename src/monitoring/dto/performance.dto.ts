import { IsEnum, IsOptional, IsNumber, IsString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetricType, MetricSeverity } from '../entities/performance-metric.entity';

export class PerformanceMetricDto {
  @ApiProperty({ enum: MetricType })
  @IsEnum(MetricType)
  type: MetricType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  method?: string;

  @ApiProperty()
  @IsNumber()
  duration: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  statusCode?: number;

  @ApiPropertyOptional({ enum: MetricSeverity, default: MetricSeverity.LOW })
  @IsOptional()
  @IsEnum(MetricSeverity)
  severity?: MetricSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class PerformanceQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  offset?: number;
}

export class PerformanceReportDto {
  @ApiProperty()
  totalRequests: number;

  @ApiProperty()
  averageResponseTime: number;

  @ApiProperty()
  p50: number;

  @ApiProperty()
  p95: number;

  @ApiProperty()
  p99: number;

  @ApiProperty()
  errorRate: number;

  @ApiProperty()
  throughput: number;

  @ApiProperty()
  slowQueries: number;

  @ApiProperty()
  cacheHitRate: number;
}

export class OptimizationRecommendationDto {
  @ApiProperty()
  category: string;

  @ApiProperty()
  priority: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty()
  description: string;

  @ApiProperty()
  impact: string;

  @ApiProperty()
  action: string;

  @ApiPropertyOptional()
  estimatedImprovement?: string;
}
