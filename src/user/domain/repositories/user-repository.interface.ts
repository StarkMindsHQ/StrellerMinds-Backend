import { IRepository } from '../../../shared/domain/repositories/repository.interface';
import { User } from '../entities/user.entity';

export const USER_REPOSITORY = 'IUserRepository';

export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
}

export interface IUserRepository extends IRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findBySearchTerm(searchTerm: string, limit: number, afterId?: string): Promise<PaginatedResult<User>>;
  findAllActive(): Promise<User[]>;
  findPaginated(limit: number, afterId?: string): Promise<PaginatedResult<User>>;
}
