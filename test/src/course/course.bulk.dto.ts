import { ApiProperty } from '@nestjs/swagger';
import { CreateCourseDto, UpdateCourseDto } from './course.dto';
import { IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkCreateDto {
  @ApiProperty({ type: [CreateCourseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCourseDto)
  courses: CreateCourseDto[];
}

export class CourseUpdateItem {
  @ApiProperty()
  @IsNumber()
  id: number;

  @ApiProperty()
  @ValidateNested()
  @Type(() => UpdateCourseDto)
  data: UpdateCourseDto;
}

export class BulkUpdateDto {
  @ApiProperty({ type: [CourseUpdateItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseUpdateItem)
  courses: CourseUpdateItem[];
}

export class BulkDeleteDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  ids: number[];
}
