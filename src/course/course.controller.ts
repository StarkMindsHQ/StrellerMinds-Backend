import { Controller, Post, Body, Param, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { JwtAuthGuard, Roles } from '../auth/guards/auth.guard';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Create a new course', description: 'Allows admins and instructors to create new educational courses.' })
  @ApiResponse({ status: 201, description: 'The course has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Only instructors or admins can create courses.' })
  create(@Body() dto: CreateCourseDto) {
    return this.courseService.createCourse(dto);
  }

  @Post(':id/modules')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Add a module to a course', description: 'Adds a new educational module to an existing course.' })
  @ApiParam({ name: 'id', description: 'The unique identifier of the course', example: 'uuid-v4-string' })
  @ApiResponse({ status: 201, description: 'The module has been successfully added.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  addModule(@Param('id') id: string, @Body() dto: CreateModuleDto) {
    return this.courseService.addModule(id, dto);
  }

  @Post('modules/:id/lessons')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Add a lesson to a module', description: 'Adds a specific lesson to an existing module.' })
  @ApiParam({ name: 'id', description: 'The unique identifier of the module', example: 'uuid-v4-string' })
  @ApiResponse({ status: 201, description: 'The lesson has been successfully added.' })
  @ApiResponse({ status: 404, description: 'Module not found.' })
  addLesson(@Param('id') id: string, @Body() dto: CreateLessonDto) {
    return this.courseService.addLesson(id, dto);
  }

  @Post(':id/enroll')
  @ApiOperation({ summary: 'Enroll a student in a course', description: 'Enrolls the current student in the specified course.' })
  @ApiParam({ name: 'id', description: 'The unique identifier of the course', example: 'uuid-v4-string' })
  @ApiBody({ schema: { properties: { studentId: { type: 'string', example: 'student-uuid' } } } })
  @ApiResponse({ status: 200, description: 'Student successfully enrolled.' })
  @ApiResponse({ status: 400, description: 'Enrollment failed (e.g. already enrolled).' })
  @ApiResponse({ status: 404, description: 'Course or student not found.' })
  enroll(@Param('id') id: string, @Body('studentId') studentId: string) {
    return this.courseService.enroll(studentId, id);
  }

  @Post(':id/publish')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Publish a course', description: 'Makes a course visible and accessible to students.' })
  @ApiParam({ name: 'id', description: 'The unique identifier of the course', example: 'uuid-v4-string' })
  @ApiResponse({ status: 200, description: 'Course published successfully.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  publish(@Param('id') id: string) {
    return this.courseService.publishCourse(id);
  }
}
