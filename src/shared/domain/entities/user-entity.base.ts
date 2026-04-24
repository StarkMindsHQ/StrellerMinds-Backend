import { DomainEntity } from './domain-entity.base';

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
 * Shared base for User domain entities across modules.
 * Eliminates duplication between auth and user bounded contexts.
 */
export abstract class BaseUserEntity extends DomainEntity<UserPrimitives> {
  protected readonly email: string;
  protected readonly firstName: string | null;
  protected readonly lastName: string | null;
  protected readonly isActive: boolean;

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
