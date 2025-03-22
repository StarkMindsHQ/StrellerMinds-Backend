import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Request,
  } from '@nestjs/common';
  import { ProgressService } from './progress.service';
  import { UpdateProgressDto } from '../progress/dtos/update-lesson-progress.dto';
  import { UpdateMultipleProgressDto } from '../progress/dtos/update-multiple-progress.dto';
  import { UserProgress } from 'src/users/entities/user-progress.entity';
  
  @Controller('progress')
  export class ProgressController {
    constructor(private readonly progressService: ProgressService) {}
  
    @Post('lesson')
    async updateLessonProgress(
      @Body() updateProgressDto: UpdateProgressDto,
      @Request() req,
    ): Promise<UserProgress> {
      updateProgressDto.userId = req.user.id;
      
      return this.progressService.updateLessonProgress(updateProgressDto);
    }
  
    @Get('course/:courseId')
    async getCourseProgress(
      @Param('courseId') courseId: string,
      @Request() req,
    ): Promise<UserProgress> {
      return this.progressService.getCourseProgress(req.user.id, courseId);
    }
  
    @Get('course/:courseId/lessons')
    async getCourseLessonsProgress(
      @Param('courseId') courseId: string,
      @Request() req,
    ): Promise<UserProgress[]> {
      return this.progressService.getCourseLessonsProgress(req.user.id, courseId);
    }
  
    @Post('lessons/batch')
    async updateMultipleLessonsProgress(
      @Body() updateDto: UpdateMultipleProgressDto,
      @Request() req,
    ): Promise<{ success: boolean }> {
      await this.progressService.updateMultipleLessonsProgress(
        req.user.id,
        updateDto.courseId,
        updateDto.lessonIds,
        updateDto.isCompleted,
      );
      return { success: true };
    }

    @Get('stats')
    async getUserAchievementStats(@Request() req): Promise<any> {
      return this.progressService.getUserAchievementStats(req.user.id);
    }
  }