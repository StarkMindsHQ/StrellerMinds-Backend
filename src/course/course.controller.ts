import { Controller, Get, Param, Query, Header } from '@nestjs/common';
import { CourseService } from './course.service';

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get()
  @Header('X-Content-Type-Options', 'nosniff')
  findAll(
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    const defaultLimit = 20;
    const requestedLimit = limit ? parseInt(limit.toString(), 10) : defaultLimit;
    return this.courseService.findAll(category, difficulty, cursor, requestedLimit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courseService.findOne(id);
  }
}
