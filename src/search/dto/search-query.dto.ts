/* eslint-disable prettier/prettier */
import {
  IsOptional,
  IsString,
  IsNumber,
  IsIn,
  IsArray,
  Min,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsIn(['course', 'forum', 'user', 'all'])
  type: 'course' | 'forum' | 'user' | 'all' = 'all';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'relevance';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minRating?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPublished?: boolean;

  @IsOptional()
  filters?: Record<string, any>;
}
