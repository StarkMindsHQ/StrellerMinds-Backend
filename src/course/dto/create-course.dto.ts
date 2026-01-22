import { IsString } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  level: string;

  @IsString()
  language: string;
}
