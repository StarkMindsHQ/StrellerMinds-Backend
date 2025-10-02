import { IsString, IsNumber, Min, IsEnum, IsOptional, IsArray } from 'class-validator';

export class CreateCoursesAdvanceDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  category: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsEnum(['draft', 'published', 'archived'])
  @IsOptional()
  status?: 'draft' | 'published' | 'archived';

  @IsEnum(['beginner', 'intermediate', 'advanced'])
  @IsOptional()
  level?: 'beginner' | 'intermediate' | 'advanced';

  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsArray()
  @IsOptional()
  requirements?: string[];

  @IsArray()
  @IsOptional()
  learningOutcomes?: string[];

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;
}
