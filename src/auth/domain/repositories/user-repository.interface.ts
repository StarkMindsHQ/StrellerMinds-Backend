import { IRepository } from '../../../shared/domain/repositories/repository.interface';
import { User } from '../entities/user.entity';

/**
 * User Repository Interface
 * Extends the generic IRepository with User-specific query methods
 */
export interface IUserRepository extends IRepository<User> {
  /**
   * Find a user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Check if a user exists by email
   */
  existsByEmail(email: string): Promise<boolean>;

  /**
   * Find active users
   */
  findAllActive(): Promise<User[]>;
}
