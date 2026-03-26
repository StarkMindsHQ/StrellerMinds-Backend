import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CourseLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export class CreateCourseDto {
  @ApiProperty({ description: 'The title of the course', example: 'Stellar Foundation 101' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Detailed description of the course content',
    example: 'A comprehensive introduction to Stellar blockchain, anchors, and assets.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Target skill level for the course',
    enum: CourseLevel,
    example: CourseLevel.BEGINNER,
  })
  @IsEnum(CourseLevel)
  level: CourseLevel;

  @ApiProperty({ description: 'Primary language of the course', example: 'English' })
  @IsString()
  @IsNotEmpty()
  language: string;
}
