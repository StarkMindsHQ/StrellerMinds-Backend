import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CoursesService } from '../services/courses.service';
import { CreateCourseDtoV2, CourseQueryDtoV2 } from '../dto';
import { ApiVersion } from '../../../common/decorators/api-version.decorator';

@ApiTags('Courses v2')
@Controller({ path: 'courses', version: '2' })
@ApiVersion('v2')
export class CoursesControllerV2 {
  constructor(private coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all courses with enhanced filtering' })
  async findAll(@Query() query: CourseQueryDtoV2) {
    return this.coursesService.findAllV2(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course by ID with detailed information' })
  async findOne(@Param('id') id: string) {
    return this.coursesService.findOneV2(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new course with enhanced features' })
  async create(@Body() createCourseDto: CreateCourseDtoV2) {
    return this.coursesService.createV2(createCourseDto);
  }
}
