import { IsArray, IsOptional, IsObject, IsDateString, IsString, IsNumber } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { Type } from "class-transformer"

class TimeRangeDto {
  @ApiProperty({ description: "Start date for the query" })
  @IsDateString()
  start: string

  @ApiProperty({ description: "End date for the query" })
  @IsDateString()
  end: string
}

export class AnalyticsQueryDto {
  @ApiProperty({ description: "List of metrics to query", type: [String] })
  @IsArray()
  @IsString({ each: true })
  metrics: string[]

  @ApiProperty({ description: "Dimensions to group by", type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dimensions?: string[]

  @ApiProperty({ description: "Filters to apply", type: "object", required: false })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>

  @ApiProperty({ description: "Time range for the query", type: TimeRangeDto })
  @Type(() => TimeRangeDto)
  timeRange: TimeRangeDto

  @ApiProperty({ description: "Granularity for aggregation", required: false })
  @IsOptional()
  @IsString()
  granularity?: string

  @ApiProperty({ description: "Limit number of results", required: false })
  @IsOptional()
  @IsNumber()
  limit?: number
}
