// src/courses/dto/create-course-review.dto.ts
import { IsNotEmpty, IsInt, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateCourseReviewDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
