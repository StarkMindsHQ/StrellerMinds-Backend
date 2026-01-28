import { IsEnum, IsString, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { AssignmentType } from '../entities/assignment.entity';

export class SubmitAssignmentDto {
  @IsUUID()
  assignmentId: string;

  @IsEnum(AssignmentType)
  submissionType: AssignmentType;

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  codeContent?: string;

  @IsOptional()
  @IsString()
  programmingLanguage?: string;

  @IsOptional()
  @IsBoolean()
  submitAsFinal?: boolean;
}