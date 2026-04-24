import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { RateLimitGuard } from 'src/auth/guards';
import { EntityNotFoundException } from '../shared/domain/exceptions/domain-exceptions';

@Controller('courses')
@UseInterceptors(ClassSerializerInterceptor)
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @UseGuards(RateLimitGuard('REGISTER'))
  @Get()
  findAll(@Query('category') category?: string, @Query('difficulty') difficulty?: string) {
    return this.courseService.findAll(category, difficulty);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const course = await this.courseService.findOne(id);
    if (!course) {
      throw new EntityNotFoundException('Course', id);
    }
    return course;
  }
}
