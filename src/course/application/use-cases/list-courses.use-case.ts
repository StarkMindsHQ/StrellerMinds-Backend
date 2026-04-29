import { Injectable, Inject } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case.base';
import { ICourseRepository, COURSE_REPOSITORY } from '../../domain/repositories/course-repository.interface';

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
  constructor(@Inject(COURSE_REPOSITORY) private readonly courseRepository: ICourseRepository) {
    super();
  }

  async execute(request: ListCoursesRequest): Promise<ListCoursesResponse> {
    const limit = request.limit || 20;
    const { cursor } = request;

    let result;
    if (request.category && request.difficulty) {
      result = await this.courseRepository.findByCategoryAndDifficulty(request.category, request.difficulty, limit, cursor);
    } else if (request.category) {
      result = await this.courseRepository.findByCategory(request.category, limit, cursor);
    } else if (request.difficulty) {
      result = await this.courseRepository.findByDifficulty(request.difficulty, limit, cursor);
    } else {
      result = await this.courseRepository.findPaginated(limit, cursor);
    }

    const courseItems = result.items.map((course) => {
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

    const nextCursor = result.hasMore && courseItems.length > 0 ? courseItems[courseItems.length - 1].id : null;

    return new ListCoursesResponse(courseItems, nextCursor, result.hasMore);
  }
}
