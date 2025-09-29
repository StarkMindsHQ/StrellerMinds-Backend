import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseModuleDto } from './create.course.moduledto';

export class UpdateCourseModuleDto extends PartialType(CreateCourseModuleDto) {}
