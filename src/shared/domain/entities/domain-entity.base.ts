/**
 * Base class for all domain entities
 * Implements core functionality that all entities should have
 */
export abstract class DomainEntity<T = any> {
  protected readonly id: string;
  protected createdAt: Date;
  protected updatedAt: Date;

  constructor(id: string, createdAt: Date, updatedAt: Date) {
    this.id = id;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  getId(): string {
    return this.id;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  /**
   * Returns a string representation of the entity
   * Useful for logging and debugging
   */
  abstract toPrimitives(): T;
}
