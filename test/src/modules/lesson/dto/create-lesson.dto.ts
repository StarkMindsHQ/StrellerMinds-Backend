import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { LessonType } from '../enums/lesson-type.enum';

export class CreateLessonDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  order: number;

  @IsNotEmpty()
  @IsEnum(LessonType)
  type: LessonType;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  resources?: Record<string, any>[];

  @IsNotEmpty()
  @IsUUID()
  moduleId: string;
}
