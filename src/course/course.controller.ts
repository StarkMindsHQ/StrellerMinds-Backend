import { Controller, Post, Body, Param } from "@nestjs/common";
import { CourseService } from "./course.service";
import { CreateCourseDto } from "./dto/create-course.dto";
import { CreateLessonDto } from "./dto/create-lesson.dto";
import { CreateModuleDto } from "./dto/create-module.dto";

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  create(@Body() dto: CreateCourseDto) {
    return this.courseService.createCourse(dto);
  }

  @Post(':id/modules')
  addModule(@Param('id') id: string, @Body() dto: CreateModuleDto) {
    return this.courseService.addModule(id, dto);
  }

  @Post('modules/:id/lessons')
  addLesson(@Param('id') id: string, @Body() dto: CreateLessonDto) {
    return this.courseService.addLesson(id, dto);
  }

  @Post(':id/enroll')
  enroll(@Param('id') id: string, @Body('studentId') studentId: string) {
    return this.courseService.enroll(studentId, id);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.courseService.publishCourse(id);
  }
}
