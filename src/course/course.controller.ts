/**
 * CourseController handles endpoints for retrieving courses.
 */
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CourseService } from './course.service';

@ApiTags('courses')
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  /**
   * Get all courses
   * @returns List of courses
   */
  @ApiOperation({ summary: 'Get all courses' })
  @ApiResponse({ status: 200, description: 'List of courses.' })
  @Get()
  getAllCourses() {
    return this.courseService.getAllCourses();
  }
}
