import { Controller, Get, Param, Query, UseGuards, Header } from '@nestjs/common';
import { ListCoursesUseCase, ListCoursesRequest } from './application/use-cases/list-courses.use-case';
import { GetCourseUseCase, GetCourseRequest } from './application/use-cases/get-course.use-case';
import { RateLimitGuard } from 'src/auth/guards';

@Controller('courses')
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
    return this.getCourseUseCase.execute(new GetCourseRequest(id));
  }
}
