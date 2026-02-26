import { ApiProperty } from '@nestjs/swagger/dist/decorators/api-property.decorator';
import { IsString } from 'class-validator';


export class CreateCourseDto {
  @ApiProperty({ example: 'Introduction to NestJS', description: 'Course title' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Learn NestJS from scratch', description: 'Course description' })
  @IsString()
  description: string;

  @IsString()
  level: string;

  @IsString()
  language: string;
}
