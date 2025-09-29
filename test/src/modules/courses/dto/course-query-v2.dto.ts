import { IsOptional, IsString, IsNumber, Min, IsArray, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

enum SortField {
  TITLE = 'title',
  PRICE = 'price',
  CREATED_AT = 'createdAt',
  RATING = 'rating'
}

export class CourseQueryDtoV2 {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => value?.split(',') || [])
  tags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiProperty({ enum: SortField, required: false, default: SortField.CREATED_AT })
  @IsOptional()
  @IsEnum(SortField)
  sortBy?: SortField = SortField.CREATED_AT;

  @ApiProperty({ enum: SortOrder, required: false, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
