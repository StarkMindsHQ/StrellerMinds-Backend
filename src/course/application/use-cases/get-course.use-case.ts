import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case.base';
import { ICourseRepository } from '../../domain/repositories/course-repository.interface';
import { CourseNotFoundException } from '../../domain/exceptions/course-exceptions';

/**
 * Get Course Use Case Request
 */
export class GetCourseRequest {
  constructor(public readonly courseId: string) {}
}

/**
 * Get Course Use Case Response
 */
export class GetCourseResponse {
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
 * Get Course Use Case
 * Retrieves a single course by ID
 */
@Injectable()
export class GetCourseUseCase extends UseCase<GetCourseRequest, GetCourseResponse> {
  constructor(private readonly courseRepository: ICourseRepository) {
    super();
  }

  async execute(request: GetCourseRequest): Promise<GetCourseResponse> {
    const course = await this.courseRepository.findById(request.courseId);

    if (!course) {
      throw new CourseNotFoundException(request.courseId);
    }

    const primitives = course.toPrimitives();
    return new GetCourseResponse(
      primitives.id,
      primitives.title,
      primitives.description,
      primitives.category,
      primitives.difficulty,
      primitives.isActive,
      primitives.createdAt,
      primitives.updatedAt,
    );
  }
}
