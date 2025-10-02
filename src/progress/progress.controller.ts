import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

/**
 * Controller for user progress tracking endpoints.
 */
@ApiTags('Progress')
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  /**
   * Mark a lesson as completed for a user.
   */
  @Post(':userId/complete/:lessonId')
  @ApiOperation({
    summary: 'Complete lesson',
    description: 'Mark a lesson as completed for a user.',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'lessonId', description: 'Lesson ID' })
  @ApiResponse({ status: 201, description: 'Lesson marked as completed.' })
  completeLesson(@Param('userId') userId: number, @Param('lessonId') lessonId: number) {
    this.progressService.completeLesson(userId, lessonId);
    return { message: 'Lesson marked as completed' };
  }

  /**
   * Get progress data for a user.
   */
  @Get(':userId')
  @ApiOperation({ summary: 'Get user progress', description: 'Get progress data for a user.' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'totalLessons', description: 'Total number of lessons', required: true })
  @ApiResponse({ status: 200, description: 'User progress data.' })
  getUserProgress(@Param('userId') userId: number, @Query('totalLessons') totalLessons: number) {
    return this.progressService.getProgressData(userId, totalLessons);
  }
}
