import { IsOptional, IsDateString, IsUUID, IsInt, Min, Max } from "class-validator"
import { Type } from "class-transformer"

export class AnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsUUID()
  courseId?: string

  @IsOptional()
  @IsUUID()
  instructorId?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20
}
