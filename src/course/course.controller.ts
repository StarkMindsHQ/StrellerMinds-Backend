import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Header,
} from '@nestjs/common';
import { CourseService } from './course.service';

import {
  ListCoursesUseCase,
  ListCoursesRequest,
} from './application/use-cases/list-courses.use-case';
import { GetCourseUseCase, GetCourseRequest } from './application/use-cases/get-course.use-case';
import { RateLimitGuard } from 'src/auth/guards';
import { EntityNotFoundException } from '../shared/domain/exceptions/domain-exceptions';

@Controller('courses')
@UseInterceptors(ClassSerializerInterceptor)
export class CourseController {
  constructor(
    private readonly listCoursesUseCase: ListCoursesUseCase,
    private readonly getCourseUseCase: GetCourseUseCase,
  ) {}

  @UseGuards(RateLimitGuard('REGISTER'))
  @Get()
  @Header('X-Next-Cursor', '')
  async findAll(
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    const defaultLimit = 20;
    const requestedLimit = limit ? parseInt(limit.toString(), 10) : defaultLimit;
    return this.listCoursesUseCase.execute(
      new ListCoursesRequest(category, difficulty, cursor, requestedLimit),
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const course = await this.getCourseUseCase.execute(new GetCourseRequest(id));
    if (!course) {
      throw new EntityNotFoundException('Course', id);
    }
    return course;
  }
}
