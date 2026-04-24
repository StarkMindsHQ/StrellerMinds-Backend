import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case.base';
import { ICourseRepository } from '../../domain/repositories/course-repository.interface';

/**
 * List Courses Use Case Request
 */
export class ListCoursesRequest {
  constructor(
    public readonly category?: string,
    public readonly difficulty?: string,
    public readonly cursor?: string,
    public readonly limit?: number,
  ) {}
}

/**
 * List Courses Course Item
 */
export class ListCourseItem {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly category: string | undefined,
    public readonly difficulty: string | undefined,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

/**
 * List Courses Use Case Response
 */
export class ListCoursesResponse {
  constructor(
    public readonly courses: ListCourseItem[],
    public readonly nextCursor: string | null,
    public readonly hasMore: boolean,
  ) {}
}

/**
 * List Courses Use Case
 * Lists courses with optional filtering by category and difficulty
 */
@Injectable()
export class ListCoursesUseCase extends UseCase<ListCoursesRequest, ListCoursesResponse> {
  constructor(private readonly courseRepository: ICourseRepository) {
    super();
  }

  async execute(request: ListCoursesRequest): Promise<ListCoursesResponse> {
    const limit = request.limit || 20;

    let courses = [];

    if (request.category && request.difficulty) {
      courses = await this.courseRepository.findByCategoryAndDifficulty(
        request.category,
        request.difficulty,
      );
    } else if (request.category) {
      courses = await this.courseRepository.findByCategory(request.category);
    } else if (request.difficulty) {
      courses = await this.courseRepository.findByDifficulty(request.difficulty);
    } else {
      courses = await this.courseRepository.findAll();
    }

    // Apply cursor-based pagination
    let filteredCourses = courses;
    if (request.cursor) {
      const cursorIndex = courses.findIndex((c) => c.id === request.cursor);
      if (cursorIndex !== -1) {
        filteredCourses = courses.slice(cursorIndex + 1);
      }
    }

    // Check if there are more results
    const hasMore = filteredCourses.length > limit;

    // Take only the requested limit
    const paginatedCourses = hasMore ? filteredCourses.slice(0, limit) : filteredCourses;

    const courseItems = paginatedCourses.map((course) => {
      const primitives = course.toPrimitives();
      return new ListCourseItem(
        primitives.id,
        primitives.title,
        primitives.description,
        primitives.category,
        primitives.difficulty,
        primitives.isActive,
        primitives.createdAt,
        primitives.updatedAt,
      );
    });

    // Generate next cursor
    const nextCursor =
      hasMore && courseItems.length > 0 ? courseItems[courseItems.length - 1].id : null;

    return new ListCoursesResponse(courseItems, nextCursor, hasMore);
  }
}
