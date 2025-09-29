import { IsEnum, IsOptional, IsString, IsNumber, IsArray, IsUUID, IsBoolean, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LearningPathStatus, LearningPathType } from '../entities/learning-path.entity';

export class CreateLearningPathStepDto {
  @ApiProperty({ description: 'Step title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Step description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Course ID for this step' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiProperty({ description: 'Order of the step in the path' })
  @IsNumber()
  @Min(0)
  order: number;

  @ApiPropertyOptional({ description: 'Whether this step is optional', default: false })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean = false;

  @ApiPropertyOptional({ description: 'Prerequisites for this step' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiPropertyOptional({ description: 'Estimated duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Additional metadata for the step' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateLearningPathDto {
  @ApiProperty({ description: 'Learning path title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Learning path description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'User ID who owns this learning path' })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: LearningPathType, description: 'Type of learning path' })
  @IsEnum(LearningPathType)
  type: LearningPathType;

  @ApiProperty({ description: 'Steps in the learning path' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLearningPathStepDto)
  steps: CreateLearningPathStepDto[];

  @ApiPropertyOptional({ description: 'Tags associated with the path' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Skills covered in this path' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: 'Difficulty level' })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({ description: 'Estimated total duration in hours' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDurationHours?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateLearningPathDto {
  @ApiPropertyOptional({ description: 'Learning path title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Learning path description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: LearningPathStatus, description: 'Status of the learning path' })
  @IsOptional()
  @IsEnum(LearningPathStatus)
  status?: LearningPathStatus;

  @ApiPropertyOptional({ description: 'Tags associated with the path' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Skills covered in this path' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: 'Difficulty level' })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({ description: 'Progress percentage (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class LearningPathStepResponseDto {
  @ApiProperty({ description: 'Step ID' })
  id: string;

  @ApiProperty({ description: 'Step title' })
  title: string;

  @ApiPropertyOptional({ description: 'Step description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Course ID' })
  courseId?: string;

  @ApiProperty({ description: 'Order in the path' })
  order: number;

  @ApiProperty({ description: 'Whether step is completed' })
  isCompleted: boolean;

  @ApiProperty({ description: 'Whether step is optional' })
  isOptional: boolean;

  @ApiProperty({ description: 'Whether step is unlocked' })
  isUnlocked: boolean;

  @ApiPropertyOptional({ description: 'Prerequisites' })
  prerequisites?: string[];

  @ApiPropertyOptional({ description: 'Estimated duration in minutes' })
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Step metadata' })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'When step was started' })
  startedAt?: Date;

  @ApiPropertyOptional({ description: 'When step was completed' })
  completedAt?: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Course details if applicable' })
  course?: {
    id: string;
    title: string;
    description?: string;
    thumbnail?: string;
    difficulty?: string;
    duration?: number;
  };
}

export class LearningPathResponseDto {
  @ApiProperty({ description: 'Learning path ID' })
  id: string;

  @ApiProperty({ description: 'Path title' })
  title: string;

  @ApiPropertyOptional({ description: 'Path description' })
  description?: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ enum: LearningPathType, description: 'Type of path' })
  type: LearningPathType;

  @ApiProperty({ enum: LearningPathStatus, description: 'Status of path' })
  status: LearningPathStatus;

  @ApiProperty({ description: 'Steps in the path' })
  steps: LearningPathStepResponseDto[];

  @ApiPropertyOptional({ description: 'Tags' })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Skills' })
  skills?: string[];

  @ApiPropertyOptional({ description: 'Difficulty level' })
  difficulty?: string;

  @ApiPropertyOptional({ description: 'Estimated duration in hours' })
  estimatedDurationHours?: number;

  @ApiProperty({ description: 'Progress percentage' })
  progress: number;

  @ApiProperty({ description: 'Number of completed steps' })
  completedSteps: number;

  @ApiProperty({ description: 'Total number of steps' })
  totalSteps: number;

  @ApiPropertyOptional({ description: 'Path metadata' })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'When path was started' })
  startedAt?: Date;

  @ApiPropertyOptional({ description: 'When path was completed' })
  completedAt?: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class GetLearningPathsQueryDto {
  @ApiPropertyOptional({ description: 'Number of paths to return', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Offset for pagination', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ enum: LearningPathType, description: 'Filter by path type' })
  @IsOptional()
  @IsEnum(LearningPathType)
  type?: LearningPathType;

  @ApiPropertyOptional({ enum: LearningPathStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(LearningPathStatus)
  status?: LearningPathStatus;

  @ApiPropertyOptional({ description: 'Filter by difficulty' })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({ description: 'Filter by tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Filter by skills' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: 'Sort by field', enum: ['createdAt', 'progress', 'title'] })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'progress' | 'title' = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class GenerateLearningPathDto {
  @ApiProperty({ description: 'User ID to generate path for' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Target skills to learn' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetSkills?: string[];

  @ApiPropertyOptional({ description: 'Preferred difficulty level' })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({ description: 'Maximum duration in hours' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxDurationHours?: number;

  @ApiPropertyOptional({ description: 'Learning objectives' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectives?: string[];

  @ApiPropertyOptional({ description: 'Preferred learning style' })
  @IsOptional()
  @IsString()
  learningStyle?: string;

  @ApiPropertyOptional({ description: 'Time availability per week in hours' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  weeklyTimeCommitment?: number;
}

export class UpdateLearningPathStepDto {
  @ApiPropertyOptional({ description: 'Mark step as completed' })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}
