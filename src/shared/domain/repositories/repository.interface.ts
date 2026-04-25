import { DomainEntity } from '../entities/domain-entity.base';

/**
 * Generic repository interface
 * All repositories in the domain layer must implement this interface
 * This ensures a consistent API for data access operations
 */
export interface IRepository<T extends DomainEntity> {
  /**
   * Save a new entity or update an existing one
   */
  save(entity: T): Promise<T>;

  /**
   * Find an entity by its ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find all entities
   */
  findAll(): Promise<T[]>;

  /**
   * Delete an entity by its ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Check if an entity exists by its ID
   */
  exists(id: string): Promise<boolean>;
}
