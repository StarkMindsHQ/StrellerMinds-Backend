import { IsString, IsOptional, IsArray, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchQueryDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  difficulty?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  minDuration?: number;

  @IsOptional()
  @IsInt()
  @Max(1000)
  maxDuration?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  size?: number = 10;

  @IsOptional()
  @IsEnum(['relevance', 'date', 'popularity', 'duration'])
  sortBy?: string = 'relevance';

  @IsOptional()
  @IsString()
  userId?: string;
}

export class AutoSuggestDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  limit?: number = 5;
}
