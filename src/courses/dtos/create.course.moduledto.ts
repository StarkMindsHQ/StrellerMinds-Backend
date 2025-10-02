import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsUUID,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCourseModuleDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  order: number;

  @IsNumber()
  @Min(0)
  durationInMinutes: number;

  @IsOptional()
  @IsUrl()
  contentUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
