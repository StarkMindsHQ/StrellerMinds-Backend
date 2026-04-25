import { IRepository } from '../../../shared/domain/repositories/repository.interface';
import { Course } from '../entities/course.entity';

/**
 * Course Repository Interface
 * Extends the generic IRepository with Course-specific query methods
 */
export interface ICourseRepository extends IRepository<Course> {
  /**
   * Find courses by category
   */
  findByCategory(category: string): Promise<Course[]>;

  /**
   * Find courses by difficulty level
   */
  findByDifficulty(difficulty: string): Promise<Course[]>;

  /**
   * Find courses by both category and difficulty
   */
  findByCategoryAndDifficulty(category: string, difficulty: string): Promise<Course[]>;

  /**
   * Find all active courses
   */
  findAllActive(): Promise<Course[]>;

  /**
   * Search courses by title
   */
  findByTitle(title: string): Promise<Course[]>;
}
