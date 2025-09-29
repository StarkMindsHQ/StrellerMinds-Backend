import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/**
 * Controller for lesson-related endpoints.
 */
@ApiTags('Lesson')
@Controller('lesson')
export class LessonController {}
