/**
 * ProgressController handles user progress tracking and analytics endpoints.
 */
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ProgressService } from '../services/progress.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UpdateProgressDto } from '../dtos/update-progress.dto';
import { Role } from 'src/role/roles.enum';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('Progress')
@ApiBearerAuth()
@Controller('progress')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @ApiOperation({ summary: 'Update lesson progress' })
  @ApiParam({ name: 'courseId', type: 'string', description: 'Course ID' })
  @ApiParam({ name: 'lessonId', type: 'string', description: 'Lesson ID' })
  @ApiBody({ type: UpdateProgressDto })
  @ApiResponse({ status: 200, description: 'Lesson progress updated.' })
  @Post('courses/:courseId/lessons/:lessonId')
  async updateLessonProgress(
    @Request() req,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() updateProgressDto: UpdateProgressDto,
  ) {
    try {
      return await this.progressService.updateLessonProgress(
        req.user.id,
        courseId,
        lessonId,
        updateProgressDto.progressPercentage,
        updateProgressDto.metadata,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update lesson progress',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Get course progress' })
  @ApiParam({ name: 'courseId', type: 'string', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course progress.' })
  @Get('courses/:courseId')
  async getCourseProgress(
    @Request() req,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    try {
      return await this.progressService.getCourseProgress(req.user.id, courseId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to retrieve course progress',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Get user progress' })
  @ApiResponse({ status: 200, description: 'User progress.' })
  @Get('user')
  async getUserProgress(@Request() req) {
    try {
      return await this.progressService.getUserProgress(req.user.id);
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve user progress',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Sync course progress' })
  @ApiParam({ name: 'courseId', type: 'string', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Progress synchronized.' })
  @Post('courses/:courseId/sync')
  async syncProgress(
    @Request() req,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    try {
      await this.progressService.syncProgress(req.user.id, courseId);
      return { message: 'Progress synchronized successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to synchronize progress',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Get course progress (admin)' })
  @ApiParam({ name: 'courseId', type: 'string', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Admin course progress.' })
  @Get('admin/courses/:courseId')
  @Roles(Role.Admin)
  async getCourseProgressAdmin(
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    try {
      // For admin, you may want to pass a special userId or null if your service supports it, or fetch all users' progress for the course.
      // Here, we'll pass null as userId, but you may need to adjust the service logic if it doesn't handle null.
      return await this.progressService.getCourseProgress(null, courseId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to retrieve admin course progress',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Get learning analytics' })
  @ApiParam({ name: 'courseId', type: 'string', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Learning analytics.' })
  @Get('courses/:courseId/analytics')
  async getLearningAnalytics(
    @Request() req,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    try {
      return await this.progressService.getLearningAnalytics(req.user.id, courseId);
    } catch (error) {
      throw new HttpException('Failed to retrieve analytics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Get adaptive next lessons' })
  @ApiParam({ name: 'courseId', type: 'string', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Adaptive next lessons.' })
  @Get('courses/:courseId/adaptive-next')
  async getAdaptiveNextLessons(
    @Request() req,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    try {
      return await this.progressService.getAdaptiveNextLessons(req.user.id, courseId);
    } catch (error) {
      throw new HttpException('Failed to retrieve adaptive next lessons', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Get progress visualization' })
  @ApiParam({ name: 'courseId', type: 'string', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Progress visualization.' })
  @Get('courses/:courseId/visualization')
  async getProgressVisualization(
    @Request() req,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    try {
      return await this.progressService.getProgressVisualization(req.user.id, courseId);
    } catch (error) {
      throw new HttpException('Failed to retrieve progress visualization', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Get learning outcome metrics' })
  @ApiParam({ name: 'courseId', type: 'string', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Learning outcome metrics.' })
  @Get('courses/:courseId/outcomes')
  async getLearningOutcomeMetrics(
    @Request() req,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    try {
      return await this.progressService.getLearningOutcomeMetrics(req.user.id, courseId);
    } catch (error) {
      throw new HttpException('Failed to retrieve learning outcome metrics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}