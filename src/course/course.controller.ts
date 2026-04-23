import { Controller, Get, Param, Query } from '@nestjs/common';
import { CourseService } from './course.service';

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
  ) {
    return this.courseService.findAll(category, difficulty);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courseService.findOne(id);
  }
}
