import { IRepository } from '../../../shared/domain/repositories/repository.interface';
import { User } from '../entities/user.entity';

/**
 * User Repository Interface (for User Module)
 * Extends the generic IRepository with User-specific query methods
 */
export interface IUserRepository extends IRepository<User> {
  /**
   * Find a user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find users by search term (matches first name, last name, or email)
   */
  findBySearchTerm(searchTerm: string): Promise<User[]>;

  /**
   * Find all active users
   */
  findAllActive(): Promise<User[]>;
}
