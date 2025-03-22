import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, MaxLength, IsArray, Max, ArrayMinSize } from 'class-validator';
import { ManyToOne } from 'typeorm';
import { Course } from '../entities/course.entity';
import { User } from 'src/users/entities/user.entity';
import { CreateCourseModuleDto } from './create.course.moduledto';
import { Type } from 'class-transformer';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;


  
  @ManyToOne(() => User)
  user: User;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsString()
  @IsOptional()
  introVideo?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  enrollmentCount?: number;

  @IsNumber()
  @Min(0)
  @Max(10)
  @IsOptional()
  averageRating?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  reviewCount?: number;

  @IsString()
  @IsOptional()
  duration?: string;

  @IsString()
  @IsOptional()
  level?: string;

  @IsArray()
  @IsOptional()
  requirements?: string[];

  @IsArray()
  @IsOptional()
  learningOutcomes?: string[];

  @IsUUID()
  @IsNotEmpty()
  instructorId: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  
  @ManyToOne(() => Course, course => course.reviewCount, { onDelete: 'CASCADE' })
  course: Course;

  
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
