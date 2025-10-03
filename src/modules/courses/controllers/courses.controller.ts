import { Controller, Get, Param, Post, Body, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CreateCourseDto } from '../dto/create-course.dto';
import { Course } from '../entities/course.entity';

@ApiTags('Courses') 
@Controller('courses')
export class CoursesController {

  @Post()
  @ApiOperation({ 
    summary: 'Create a new course',
    description: 'Creates a new course entry in the database and returns the created object.',
  })
  @ApiBody({ type: CreateCourseDto })
  @ApiResponse({ 
    status: HttpStatus.CREATED,
    description: 'The course has been successfully created.',
    type: Course,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  create(@Body() createCourseDto: CreateCourseDto): Course {
    return new Course();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the course data.',
    type: Course,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found.' })
  findOne(@Param('id') id: string): Course {
    return new Course();
  }
}