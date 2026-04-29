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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
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
    summary: 'List courses',
    description:
      'Returns a paginated list of courses. Supports filtering by category and difficulty, and cursor-based pagination.',
  })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by course category', example: 'blockchain' })
  @ApiQuery({
    name: 'difficulty',
    required: false,
    description: 'Filter by difficulty level',
    example: 'beginner',
    enum: ['beginner', 'intermediate', 'advanced'],
  })
  @ApiQuery({ name: 'cursor', required: false, description: 'Pagination cursor from the previous response', example: 'eyJpZCI6IjEyMyJ9' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results per page (default: 20)', example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of courses',
    content: {
      'application/json': {
        example: {
          data: [
            {
              id: 'c1d2e3f4-a5b6-7890-cdef-123456789012',
              title: 'Introduction to Blockchain',
              description: 'Learn the fundamentals of blockchain technology.',
              category: 'blockchain',
              difficulty: 'beginner',
              durationMinutes: 120,
              isPublished: true,
              createdAt: '2024-01-10T08:00:00.000Z',
            },
          ],
          nextCursor: 'eyJpZCI6ImQyZTNmNGE1In0=',
          total: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
    content: {
      'application/json': {
        example: { statusCode: 429, message: 'Too many requests, please try again later.', error: 'Too Many Requests' },
      },
    },
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
    description: 'Returns a single course by its UUID.',
  })
  @ApiParam({ name: 'id', description: 'Course UUID', example: 'c1d2e3f4-a5b6-7890-cdef-123456789012' })
  @ApiResponse({
    status: 200,
    description: 'Course found',
    content: {
      'application/json': {
        example: {
          id: 'c1d2e3f4-a5b6-7890-cdef-123456789012',
          title: 'Introduction to Blockchain',
          description: 'Learn the fundamentals of blockchain technology.',
          category: 'blockchain',
          difficulty: 'beginner',
          durationMinutes: 120,
          isPublished: true,
          lessons: [
            { id: 'l1', title: 'What is Blockchain?', order: 1 },
            { id: 'l2', title: 'Consensus Mechanisms', order: 2 },
          ],
          createdAt: '2024-01-10T08:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
    content: {
      'application/json': {
        example: {
          statusCode: 404,
          message: 'Course with id c1d2e3f4-a5b6-7890-cdef-123456789012 not found',
          error: 'Not Found',
        },
      },
    },
  })
  async findOne(@Param('id') id: string) {
    const course = await this.getCourseUseCase.execute(new GetCourseRequest(id));
    if (!course) {
      throw new EntityNotFoundException('Course', id);
    }
    return course;
  }
}
