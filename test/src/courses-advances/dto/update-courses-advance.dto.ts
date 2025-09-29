import { PartialType } from '@nestjs/mapped-types';
import { CreateCoursesAdvanceDto } from './create-courses-advance.dto';

export class UpdateCoursesAdvanceDto extends PartialType(
  CreateCoursesAdvanceDto,
) {}
