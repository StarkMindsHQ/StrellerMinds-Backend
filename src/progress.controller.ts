import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ProgressService } from './progress.service';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  // ✅ Existing endpoint - complete a lesson
  @Post(':userId/complete/:lessonId')
  completeLesson(
    @Param('userId') userId: number,
    @Param('lessonId') lessonId: number
  ) {
    this.progressService.completeLesson(userId, lessonId);
    return { message: 'Lesson marked as completed' };
  }

  // ✅ Existing endpoint - get progress with query param for total lessons
  @Get(':userId')
  getUserProgress(
    @Param('userId') userId: number,
    @Query('totalLessons') totalLessons: number
  ) {
    return this.progressService.getProgressData(userId, totalLessons);
  }

  // ✅ New: Set total modules for a course
  @Post('set-course-modules')
  setCourseModules(@Body() body: { courseId: number; totalModules: number }) {
    this.progressService.setCourseModules(body.courseId, body.totalModules);
    return {
      message: `Course ${body.courseId} now has ${body.totalModules} modules.`,
    };
  }

  // ✅ New: Complete a lesson (course-specific)
  @Post('complete-lesson')
  completeLessonForCourse(
    @Body() body: { userId: number; lessonId: number; courseId: number }
  ) {
    this.progressService.completeLesson(
      body.userId,
      body.lessonId,
      body.courseId
    );
    return this.progressService.getProgressData(body.userId, body.courseId);
  }

  // ✅ New: Check user’s full course progress
  @Post('progress')
  getCourseProgress(@Body() body: { userId: number; courseId: number }) {
    return this.progressService.getProgressData(
      body.userId,
      body.courseId
    );
  }
}
