import { DomainEntity } from '../../../shared/domain/entities/domain-entity.base';

export interface UserPrimitives {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Domain Entity (for User Module)
 * This is separate from the Auth User entity
 * Represents user profile and general user information
 */
export class User extends DomainEntity<UserPrimitives> {
  private readonly email: string;
  private readonly firstName: string | null;
  private readonly lastName: string | null;
  private readonly isActive: boolean;

  constructor(
    id: string,
    email: string,
    firstName: string | null,
    lastName: string | null,
    isActive: boolean,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.isActive = isActive;
  }

  getEmail(): string {
    return this.email;
  }

  getFirstName(): string | null {
    return this.firstName;
  }

  getLastName(): string | null {
    return this.lastName;
  }

  getFullName(): string {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }

  isUserActive(): boolean {
    return this.isActive;
  }

  /**
   * Create a new User from primitives
   */
  static create(primitives: UserPrimitives): User {
    return new User(
      primitives.id,
      primitives.email,
      primitives.firstName,
      primitives.lastName,
      primitives.isActive,
      primitives.createdAt,
      primitives.updatedAt,
    );
  }

  toPrimitives(): UserPrimitives {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
