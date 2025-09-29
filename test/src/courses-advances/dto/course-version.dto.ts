import { IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';

export class CreateCourseVersionDto {
  @IsString()
  version: string;

  @IsString()
  changeLog: string;

  @IsObject()
  content: any;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
