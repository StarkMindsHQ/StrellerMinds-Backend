import { IsEnum, IsString, IsObject, IsOptional, IsUUID } from 'class-validator';
import { AnnotationType } from '../entities/annotation.entity';

export class CreateAnnotationDto {
  @IsEnum(AnnotationType)
  type: AnnotationType;

  @IsString()
  content: string;

  @IsObject()
  position: {
    page?: number;
    lineNumber?: number;
    startChar?: number;
    endChar?: number;
    x?: number;
    y?: number;
  };

  @IsOptional()
  @IsString()
  color?: string;
}
