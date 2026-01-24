import { Controller, Post, Body, Param } from "@nestjs/common";
import { CourseService } from "./course.service";
import { CreateCourseDto } from "./dto/create-course.dto";
import { CreateLessonDto } from "./dto/create-lesson.dto";
import { CreateModuleDto } from "./dto/create-module.dto";

// Controller for handling course-related API requests
@Controller('courses')
export class CourseController {
  // Inject CourseService to handle business logic
  constructor(private readonly courseService: CourseService) {}

  /**
   * Handles POST requests to create a new course.
   * @param dto The data transfer object containing course creation details.
   * @returns The newly created course.
   */
  @Post()
  create(@Body() dto: CreateCourseDto) {
    return this.courseService.createCourse(dto);
  }

  /**
   * Handles POST requests to add a module to a specific course.
   * @param id The ID of the course to which the module will be added.
   * @param dto The data transfer object containing module creation details.
   * @returns The newly created module.
   */
  @Post(':id/modules')
  addModule(@Param('id') id: string, @Body() dto: CreateModuleDto) {
    return this.courseService.addModule(id, dto);
  }

  /**
   * Handles POST requests to add a lesson to a specific module.
   * @param id The ID of the module to which the lesson will be added.
   * @param dto The data transfer object containing lesson creation details.
   * @returns The newly created lesson.
   */
  @Post('modules/:id/lessons')
  addLesson(@Param('id') id: string, @Body() dto: CreateLessonDto) {
    return this.courseService.addLesson(id, dto);
  }

  // Handles POST requests to enroll a student in a course.
  @Post(':id/enroll')
  enroll(@Param('id') id: string, @Body('studentId') studentId: string) {
    return this.courseService.enroll(studentId, id);
  }

  // Handles POST requests to publish a course.
  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.courseService.publishCourse(id);
  }
}
