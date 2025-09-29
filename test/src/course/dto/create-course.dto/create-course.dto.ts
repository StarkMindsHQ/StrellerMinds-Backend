import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';

class LessonDto {
  @IsString()
  title: string;

  @IsString()
  content: string;
}

class ModuleDto {
  @IsString()
  title: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonDto)
  lessons: LessonDto[];
}

export class CreateCourseDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  difficulty: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleDto)
  modules: ModuleDto[];
}
