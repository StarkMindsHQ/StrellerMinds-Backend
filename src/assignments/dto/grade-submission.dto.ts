import { IsNumber, IsOptional, IsString, IsArray } from 'class-validator';

export class GradeSubmissionDto {
  @IsNumber()
  score: number;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsArray()
  rubricScores?: Array<{ rubricId: string; score: number }>;

  @IsOptional()
  published?: boolean;
}
