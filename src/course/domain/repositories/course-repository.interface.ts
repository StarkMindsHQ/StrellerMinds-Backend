import { IRepository } from '../../../shared/domain/repositories/repository.interface';
import { Course } from '../entities/course.entity';

export const COURSE_REPOSITORY = 'ICourseRepository';

export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
}

export interface ICourseRepository extends IRepository<Course> {
  findByCategory(category: string, limit: number, afterId?: string): Promise<PaginatedResult<Course>>;
  findByDifficulty(difficulty: string, limit: number, afterId?: string): Promise<PaginatedResult<Course>>;
  findByCategoryAndDifficulty(category: string, difficulty: string, limit: number, afterId?: string): Promise<PaginatedResult<Course>>;
  findAllActive(): Promise<Course[]>;
  findByTitle(title: string): Promise<Course[]>;
  findPaginated(limit: number, afterId?: string): Promise<PaginatedResult<Course>>;
}
