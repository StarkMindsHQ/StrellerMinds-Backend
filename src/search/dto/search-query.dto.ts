import { IsString, IsOptional, IsArray, IsInt, Min, Max, IsEnum, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchQueryDto {
  @ApiProperty({ description: 'The search query string', example: 'blockchain basics' })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({ description: 'Filter by categories', example: ['Stellar', 'Finance'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ description: 'Filter by difficulty levels', example: ['BEGINNER', 'ADVANCED'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  difficulty?: string[];

  @ApiPropertyOptional({ description: 'Minimum resource duration in minutes', example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minDuration?: number;

  @ApiPropertyOptional({ description: 'Maximum resource duration in minutes', example: 120 })
  @IsOptional()
  @IsInt()
  @Max(1000)
  maxDuration?: number;

  @ApiPropertyOptional({ description: 'Page number for pagination', example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of results per page', example: 10, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  size?: number = 10;

  @ApiPropertyOptional({ description: 'Field to sort by', enum: ['relevance', 'date', 'popularity', 'duration'], default: 'relevance' })
  @IsOptional()
  @IsEnum(['relevance', 'date', 'popularity', 'duration'])
  sortBy?: string = 'relevance';

  @ApiPropertyOptional({ description: 'Specific user ID to personalize search', example: 'uuid-v4-string' })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class AutoSuggestDto {
  @ApiProperty({ description: 'The partial query string to get suggestions for', example: 'bloc' })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({ description: 'Maximum number of suggestions to return', example: 5, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  limit?: number = 5;
}
