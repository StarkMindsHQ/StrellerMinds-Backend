import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';
import { LearningPathService, LearningGoal, PathGenerationOptions } from '../services/learning-path.service';
import {
  CreateLearningPathDto,
  UpdateLearningPathDto,
  GetLearningPathsQueryDto,
  LearningPathResponseDto,
  LearningPathStepResponseDto,
} from '../dto/learning-path.dto';
import { LearningPath, LearningPathStatus } from '../entities/learning-path.entity';

@ApiTags('Learning Paths')
@Controller('learning-paths')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LearningPathController {
  private readonly logger = new Logger(LearningPathController.name);

  constructor(private readonly learningPathService: LearningPathService) {}

  @Get()
  @ApiOperation({ summary: 'Get learning paths for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns user learning paths',
    type: [LearningPathResponseDto],
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by learning path status' })
  @ApiQuery({ name: 'skillArea', required: false, description: 'Filter by skill area' })
  async getLearningPaths(
    @GetUser() user: User,
    @Query() query: GetLearningPathsQueryDto,
  ): Promise<{
    paths: LearningPathResponseDto[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      this.logger.log(`Getting learning paths for user ${user.id}`);

      const result = await this.learningPathService.getUserLearningPaths(user.id, query);
      const totalPages = Math.ceil(result.total / query.limit);

      return {
        paths: result.paths.map(path => this.mapToResponseDto(path)),
        total: result.total,
        pagination: {
          page: Math.floor(query.offset / query.limit) + 1,
          limit: query.limit,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting learning paths for user ${user.id}:`, error);
      throw new HttpException(
        'Failed to get learning paths',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a new personalized learning path' })
  @ApiResponse({
    status: 201,
    description: 'Learning path generated successfully',
    type: LearningPathResponseDto,
  })
  async generateLearningPath(
    @GetUser() user: User,
    @Body() request: {
      goal: LearningGoal;
      options?: Partial<PathGenerationOptions>;
    },
  ): Promise<{
    learningPath: LearningPathResponseDto;
    generationTime: number;
  }> {
    try {
      this.logger.log(`Generating learning path for user ${user.id}`);
      const startTime = Date.now();

      const defaultOptions: PathGenerationOptions = {
        maxCourses: 10,
        includeAssessments: true,
        includeProjects: true,
        adaptToProgress: true,
        considerPrerequisites: true,
      };

      const options = { ...defaultOptions, ...request.options };

      const learningPath = await this.learningPathService.generateLearningPath(
        user.id,
        request.goal,
        options,
      );

      const generationTime = Date.now() - startTime;

      return {
        learningPath: this.mapToResponseDto(learningPath),
        generationTime,
      };
    } catch (error) {
      this.logger.error(`Error generating learning path for user ${user.id}:`, error);
      throw new HttpException(
        'Failed to generate learning path',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get learning path recommendations' })
  @ApiResponse({
    status: 200,
    description: 'Returns learning path recommendations',
  })
  async getPathRecommendations(
    @GetUser() user: User,
    @Query('limit') limit: number = 5,
  ): Promise<{
    skillBasedPaths: LearningGoal[];
    trendingPaths: LearningGoal[];
    continuationPaths: LearningGoal[];
  }> {
    try {
      const recommendations = await this.learningPathService.getPathRecommendations(user.id, limit);
      return recommendations;
    } catch (error) {
      this.logger.error(`Error getting path recommendations for user ${user.id}:`, error);
      throw new HttpException(
        'Failed to get path recommendations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific learning path by ID' })
  @ApiParam({ name: 'id', description: 'Learning Path ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the learning path details',
    type: LearningPathResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Learning path not found' })
  async getLearningPath(
    @GetUser() user: User,
    @Param('id') id: string,
  ): Promise<LearningPathResponseDto> {
    try {
      const result = await this.learningPathService.getUserLearningPaths(user.id, {
        limit: 1,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });

      const learningPath = result.paths.find(p => p.id === id);
      
      if (!learningPath) {
        throw new HttpException('Learning path not found', HttpStatus.NOT_FOUND);
      }

      return this.mapToResponseDto(learningPath);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error getting learning path ${id}:`, error);
      throw new HttpException(
        'Failed to get learning path',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a learning path' })
  @ApiParam({ name: 'id', description: 'Learning Path ID' })
  @ApiResponse({
    status: 200,
    description: 'Learning path updated successfully',
    type: LearningPathResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Learning path not found' })
  async updateLearningPath(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() updateDto: UpdateLearningPathDto,
  ): Promise<LearningPathResponseDto> {
    try {
      // This would require implementing an update method in the service
      // For now, return a placeholder response
      throw new HttpException('Update functionality not yet implemented', HttpStatus.NOT_IMPLEMENTED);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error updating learning path ${id}:`, error);
      throw new HttpException(
        'Failed to update learning path',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/steps/:stepId/complete')
  @ApiOperation({ summary: 'Mark a learning path step as completed' })
  @ApiParam({ name: 'id', description: 'Learning Path ID' })
  @ApiParam({ name: 'stepId', description: 'Learning Path Step ID' })
  @ApiResponse({
    status: 200,
    description: 'Step marked as completed',
    type: LearningPathResponseDto,
  })
  async completeStep(
    @GetUser() user: User,
    @Param('id') pathId: string,
    @Param('stepId') stepId: string,
  ): Promise<{
    learningPath: LearningPathResponseDto;
    message: string;
  }> {
    try {
      const updatedPath = await this.learningPathService.updateProgress(pathId, stepId, true);
      
      return {
        learningPath: this.mapToResponseDto(updatedPath),
        message: 'Step completed successfully',
      };
    } catch (error) {
      this.logger.error(`Error completing step ${stepId} in path ${pathId}:`, error);
      throw new HttpException(
        'Failed to complete step',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id/steps/:stepId/complete')
  @ApiOperation({ summary: 'Mark a learning path step as not completed' })
  @ApiParam({ name: 'id', description: 'Learning Path ID' })
  @ApiParam({ name: 'stepId', description: 'Learning Path Step ID' })
  @ApiResponse({
    status: 200,
    description: 'Step marked as not completed',
    type: LearningPathResponseDto,
  })
  async uncompleteStep(
    @GetUser() user: User,
    @Param('id') pathId: string,
    @Param('stepId') stepId: string,
  ): Promise<{
    learningPath: LearningPathResponseDto;
    message: string;
  }> {
    try {
      const updatedPath = await this.learningPathService.updateProgress(pathId, stepId, false);
      
      return {
        learningPath: this.mapToResponseDto(updatedPath),
        message: 'Step marked as not completed',
      };
    } catch (error) {
      this.logger.error(`Error uncompleting step ${stepId} in path ${pathId}:`, error);
      throw new HttpException(
        'Failed to uncomplete step',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/adapt')
  @ApiOperation({ summary: 'Adapt learning path based on user progress' })
  @ApiParam({ name: 'id', description: 'Learning Path ID' })
  @ApiResponse({
    status: 200,
    description: 'Learning path adapted successfully',
    type: LearningPathResponseDto,
  })
  async adaptLearningPath(
    @GetUser() user: User,
    @Param('id') pathId: string,
  ): Promise<{
    learningPath: LearningPathResponseDto;
    adaptations: Array<{
      type: string;
      reason: string;
      appliedAt: Date;
    }>;
  }> {
    try {
      const adaptedPath = await this.learningPathService.adaptLearningPath(pathId);
      
      const adaptations = adaptedPath.metadata?.adaptations || [];
      
      return {
        learningPath: this.mapToResponseDto(adaptedPath),
        adaptations,
      };
    } catch (error) {
      this.logger.error(`Error adapting learning path ${pathId}:`, error);
      throw new HttpException(
        'Failed to adapt learning path',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/progress')
  @ApiOperation({ summary: 'Get detailed progress information for a learning path' })
  @ApiParam({ name: 'id', description: 'Learning Path ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns detailed progress information',
  })
  async getProgress(
    @GetUser() user: User,
    @Param('id') pathId: string,
  ): Promise<{
    pathId: string;
    title: string;
    status: LearningPathStatus;
    progressPercentage: number;
    completedSteps: number;
    totalSteps: number;
    estimatedTimeRemaining: number;
    stepProgress: Array<{
      stepId: string;
      title: string;
      completed: boolean;
      completedAt?: Date;
      estimatedDuration: number;
    }>;
    milestones: Array<{
      name: string;
      achieved: boolean;
      achievedAt?: Date;
    }>;
  }> {
    try {
      const result = await this.learningPathService.getUserLearningPaths(user.id, {
        limit: 1,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });

      const learningPath = result.paths.find(p => p.id === pathId);
      
      if (!learningPath) {
        throw new HttpException('Learning path not found', HttpStatus.NOT_FOUND);
      }

      const completedStepsTime = learningPath.steps
        .filter(step => step.completed)
        .reduce((sum, step) => sum + step.estimatedDuration, 0);

      const totalEstimatedTime = learningPath.estimatedDuration;
      const estimatedTimeRemaining = Math.max(0, totalEstimatedTime - completedStepsTime);

      // Generate milestones based on progress
      const milestones = [
        {
          name: '25% Complete',
          achieved: learningPath.progressPercentage >= 25,
          achievedAt: learningPath.progressPercentage >= 25 ? new Date() : undefined,
        },
        {
          name: '50% Complete',
          achieved: learningPath.progressPercentage >= 50,
          achievedAt: learningPath.progressPercentage >= 50 ? new Date() : undefined,
        },
        {
          name: '75% Complete',
          achieved: learningPath.progressPercentage >= 75,
          achievedAt: learningPath.progressPercentage >= 75 ? new Date() : undefined,
        },
        {
          name: 'Path Completed',
          achieved: learningPath.status === LearningPathStatus.COMPLETED,
          achievedAt: learningPath.completedAt,
        },
      ];

      return {
        pathId: learningPath.id,
        title: learningPath.title,
        status: learningPath.status,
        progressPercentage: learningPath.progressPercentage,
        completedSteps: learningPath.completedSteps,
        totalSteps: learningPath.totalSteps,
        estimatedTimeRemaining,
        stepProgress: learningPath.steps.map(step => ({
          stepId: step.id,
          title: step.title,
          completed: step.completed,
          completedAt: step.completedAt,
          estimatedDuration: step.estimatedDuration,
        })),
        milestones,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error getting progress for learning path ${pathId}:`, error);
      throw new HttpException(
        'Failed to get progress',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a learning path' })
  @ApiParam({ name: 'id', description: 'Learning Path ID' })
  @ApiResponse({ status: 200, description: 'Learning path deleted successfully' })
  @ApiResponse({ status: 404, description: 'Learning path not found' })
  async deleteLearningPath(
    @GetUser() user: User,
    @Param('id') pathId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // This would require implementing a delete method in the service
      // For now, return a placeholder response
      throw new HttpException('Delete functionality not yet implemented', HttpStatus.NOT_IMPLEMENTED);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error deleting learning path ${pathId}:`, error);
      throw new HttpException(
        'Failed to delete learning path',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get learning path analytics overview' })
  @ApiResponse({
    status: 200,
    description: 'Returns learning path analytics overview',
  })
  async getAnalyticsOverview(
    @GetUser() user: User,
  ): Promise<{
    totalPaths: number;
    activePaths: number;
    completedPaths: number;
    averageCompletionRate: number;
    totalTimeSpent: number;
    skillsLearned: number;
    currentStreak: number;
    longestStreak: number;
  }> {
    try {
      const result = await this.learningPathService.getUserLearningPaths(user.id, {
        limit: 1000, // Get all paths for analytics
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });

      const paths = result.paths;
      const totalPaths = paths.length;
      const activePaths = paths.filter(p => p.status === LearningPathStatus.IN_PROGRESS).length;
      const completedPaths = paths.filter(p => p.status === LearningPathStatus.COMPLETED).length;

      const averageCompletionRate = totalPaths > 0
        ? paths.reduce((sum, path) => sum + path.progressPercentage, 0) / totalPaths
        : 0;

      const totalTimeSpent = paths.reduce((sum, path) => {
        const completedSteps = path.steps.filter(step => step.completed);
        return sum + completedSteps.reduce((stepSum, step) => stepSum + step.estimatedDuration, 0);
      }, 0);

      // Calculate unique skills learned from completed steps
      const skillsLearned = new Set(
        paths.flatMap(path =>
          path.steps
            .filter(step => step.completed && step.course?.skills)
            .flatMap(step => step.course!.skills!)
        )
      ).size;

      // Calculate streaks (simplified - would need more sophisticated logic)
      const currentStreak = 7; // Placeholder
      const longestStreak = 14; // Placeholder

      return {
        totalPaths,
        activePaths,
        completedPaths,
        averageCompletionRate,
        totalTimeSpent,
        skillsLearned,
        currentStreak,
        longestStreak,
      };
    } catch (error) {
      this.logger.error(`Error getting analytics overview for user ${user.id}:`, error);
      throw new HttpException(
        'Failed to get analytics overview',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Map LearningPath entity to LearningPathResponseDto
   */
  private mapToResponseDto(learningPath: LearningPath): LearningPathResponseDto {
    return {
      id: learningPath.id,
      title: learningPath.title,
      description: learningPath.description,
      targetSkills: learningPath.targetSkills,
      currentLevel: learningPath.currentLevel,
      targetLevel: learningPath.targetLevel,
      status: learningPath.status,
      totalSteps: learningPath.totalSteps,
      completedSteps: learningPath.completedSteps,
      progressPercentage: learningPath.progressPercentage,
      estimatedDuration: learningPath.estimatedDuration,
      startedAt: learningPath.startedAt,
      completedAt: learningPath.completedAt,
      metadata: learningPath.metadata,
      steps: learningPath.steps?.map(step => ({
        id: step.id,
        stepType: step.stepType,
        title: step.title,
        description: step.description,
        stepOrder: step.stepOrder,
        courseId: step.courseId,
        course: step.course ? {
          id: step.course.id,
          title: step.course.title,
          description: step.course.description,
          difficulty: step.course.difficulty,
          duration: step.course.duration,
          rating: step.course.rating,
          tags: step.course.tags,
          skills: step.course.skills,
          instructor: step.course.instructor,
          thumbnailUrl: step.course.thumbnailUrl,
        } : undefined,
        estimatedDuration: step.estimatedDuration,
        completed: step.completed,
        completedAt: step.completedAt,
        metadata: step.metadata,
        createdAt: step.createdAt,
        updatedAt: step.updatedAt,
      })) || [],
      createdAt: learningPath.createdAt,
      updatedAt: learningPath.updatedAt,
    };
  }
}
