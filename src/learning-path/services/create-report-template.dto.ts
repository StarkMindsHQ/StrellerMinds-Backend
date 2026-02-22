import { IsString, IsEnum, IsObject, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportType, VisualizationType } from '../entities/report-template.entity';

export class ReportConfigurationDto {
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  metrics: string[];

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  dimensions: string[];

  @ApiProperty()
  @IsObject()
  @IsOptional()
  filters: Record<string, any>;

  @ApiProperty({ enum: VisualizationType })
  @IsEnum(VisualizationType)
  visualization: VisualizationType;
}

export class CreateReportTemplateDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty()
  @IsObject()
  configuration: ReportConfigurationDto;
}