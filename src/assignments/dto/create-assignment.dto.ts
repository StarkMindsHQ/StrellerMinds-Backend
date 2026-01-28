import { IsEnum, IsString, IsNumber, IsOptional, IsDateString, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AssignmentType } from '../entities/assignment.entity';

export class RubricCriteriaDto {
  @IsString()
  criteria: string;

  @IsString()
  description: string;

  @IsNumber()
  maxPoints: number;

  @IsNumber()
  weight: number;

  @IsOptional()
  @IsArray()
  levels?: string[];
}

export class CreateAssignmentDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(AssignmentType)
  type: AssignmentType;

  @IsOptional()
  @IsString()
  fileTypes?: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsDateString()
  lateDueDate?: string;

  @IsOptional()
  @IsNumber()
  latePenalty?: number;

  @IsOptional()
  @IsNumber()
  maxPoints?: number;

  @IsOptional()
  @IsBoolean()
  allowLateSubmission?: boolean;

  @IsOptional()
  @IsBoolean()
  allowResubmission?: boolean;

  @IsOptional()
  @IsBoolean()
  enablePeerReview?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricCriteriaDto)
  rubrics?: RubricCriteriaDto[];
}