import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LearningPathType, LearningPathStatus } from '../entities/learning-path.entity';

export class CreateLearningPathDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(LearningPathType)
  @IsOptional()
  type?: LearningPathType;

  @IsEnum(LearningPathStatus)
  @IsOptional()
  status?: LearningPathStatus;

  @IsUUID()
  @IsOptional()
  templateId?: string;

  @IsNumber()
  @IsOptional()
  estimatedDurationHours?: number;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNodeDto)
  @IsOptional()
  nodes?: CreateNodeDto[];
}

export class CreateNodeDto {
  @IsEnum(['course', 'module', 'assessment', 'project', 'milestone'])
  type: string;

  @IsUUID()
  @IsOptional()
  courseId?: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  position?: number;

  @IsNumber()
  @IsOptional()
  estimatedDurationHours?: number;

  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  prerequisiteIds?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDependencyDto)
  @IsOptional()
  dependencies?: CreateDependencyDto[];

  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  objectiveIds?: string[];

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateDependencyDto {
  @IsUUID()
  targetNodeId: string;

  @IsEnum(['prerequisite', 'corequisite', 'recommended', 'unlocks'])
  type: string;

  @IsOptional()
  conditions?: Record<string, any>;
}
