import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CourseService } from './course.service';

import {
  ListCoursesUseCase,
  ListCoursesRequest,
} from './application/use-cases/list-courses.use-case';
import { GetCourseUseCase, GetCourseRequest } from './application/use-cases/get-course.use-case';
import { RateLimitGuard } from 'src/auth/guards';
import { EntityNotFoundException } from '../shared/domain/exceptions/domain-exceptions';

@ApiTags('Courses')
@Controller('courses')
@UseInterceptors(ClassSerializerInterceptor)
export class CourseController {
  constructor(
    private readonly listCoursesUseCase: ListCoursesUseCase,
    private readonly getCourseUseCase: GetCourseUseCase,
  ) {}

  @UseGuards(RateLimitGuard('REGISTER'))
  @Get()
  @Header('X-Next-Cursor', '')
  @ApiOperation({
    summary: 'List all courses',
    description: 'Retrieves a paginated list of courses with optional filtering by category and difficulty level.',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter courses by category',
  })
  @ApiQuery({
    name: 'difficulty',
    required: false,
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    description: 'Filter courses by difficulty level',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: 'Cursor for pagination (from previous response X-Next-Cursor header)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of courses to return (default: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Courses list retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              description: { type: 'string' },
              category: { type: 'string' },
              difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        nextCursor: { type: 'string', nullable: true, description: 'Cursor for next page' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid filter or pagination parameters',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
  async findAll(
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    const defaultLimit = 20;
    const requestedLimit = limit ? parseInt(limit.toString(), 10) : defaultLimit;
    return this.listCoursesUseCase.execute(
      new ListCoursesRequest(category, difficulty, cursor, requestedLimit),
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get course by ID',
    description: 'Retrieves a specific course by its unique identifier.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Course ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Course retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
        difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async findOne(@Param('id') id: string) {
    const course = await this.getCourseUseCase.execute(new GetCourseRequest(id));
    if (!course) {
      throw new EntityNotFoundException('Course', id);
    }
    return course;
  }
}
