import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateCourseDto } from './create.course.dto';

export class UpdateCourseDto extends PartialType(OmitType(CreateCourseDto, [] as const)) {}
