import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CoursesService } from '../services/courses.service';
import { CreateCourseDto, CourseQueryDto } from '../dto';
import { ApiVersion, Deprecated } from '../../../common/decorators/api-version.decorator';

@ApiTags('Courses v1')
@Controller({ path: 'courses', version: '1' })
@ApiVersion('v1')
@Deprecated('2024-01-01', '2024-12-31', 'https://docs.strellerminds.com/api/migration/v1-to-v2')
export class CoursesControllerV1 {
  constructor(private coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all courses (deprecated)' })
  async findAll(@Query() query: CourseQueryDto) {
    return this.coursesService.findAllV1(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course by ID (deprecated)' })
  async findOne(@Param('id') id: string) {
    return this.coursesService.findOneV1(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new course (deprecated)' })
  async create(@Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.createV1(createCourseDto);
  }
}
