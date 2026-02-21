import { IsString, IsOptional, IsNumber, IsObject, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchQueryDto {
  @IsString()
  q: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @IsOptional()
  @IsString()
  sort?: string;
}

export class IndexContentDto {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  [key: string]: any;
}