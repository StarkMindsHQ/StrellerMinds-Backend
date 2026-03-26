import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '../entities/question.entity';

export class CreateOptionDto {
  @IsString()
  text: string;

  @IsOptional()
  isCorrect?: boolean;

  @IsOptional()
  @IsNumber()
  score?: number;
}

export class CreateQuestionDto {
  @IsString()
  title: string;

  @IsString()
  prompt: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsOptional()
  @IsNumber()
  maxPoints?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options?: CreateOptionDto[];

  @IsOptional()
  @IsArray()
  testCases?: Array<{ input: string; expectedOutput: string; points?: number }>;
}
