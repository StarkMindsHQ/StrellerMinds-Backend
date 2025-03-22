import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, MaxLength, IsArray, Max, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { User } from '../../users/entities/user.entity';
import { CreateCourseModuleDto } from './create.course.moduledto';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  durationInHours?: number;

  @IsString()
  @IsOptional()
  status?: string; // draft, published, archived

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsUUID()
  @IsNotEmpty()
  instructorId: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @IsUUID(undefined, { each: true })
  tagIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @Type(() => CreateCourseModuleDto)
  modules?: CreateCourseModuleDto[];
}
