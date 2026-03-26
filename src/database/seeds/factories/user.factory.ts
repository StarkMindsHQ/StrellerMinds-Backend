import { BaseFactory } from './base.factory';
import { User, UserRole, UserStatus } from '../../../auth/entities/user.entity';
import { DataSource } from 'typeorm';

export interface UserFactoryOptions {
  role?: UserRole;
  status?: UserStatus;
  isEmailVerified?: boolean;
  count?: number;
}

/**
 * Factory for generating user test data
 */
export class UserFactory extends BaseFactory<User> {
  private static readonly FIRST_NAMES = [
    'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa',
    'James', 'Mary', 'William', 'Patricia', 'Richard', 'Jennifer', 'Thomas', 'Linda',
  ];

  private static readonly LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  ];

  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  protected getRepository() {
    return this.dataSource.getRepository(User);
  }

  async create(overrides: UserFactoryOptions = {}): Promise<User> {
    const userData = this.generate(overrides);
    return await this.save(userData);
  }

  generate(overrides: UserFactoryOptions = {}): User {
    const firstName = this.randomPick(UserFactory.FIRST_NAMES);
    const lastName = this.randomPick(UserFactory.LAST_NAMES);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${this.randomNumber(1, 999)}@example.com`;

    return {
      id: this.randomUUID(),
      email,
      firstName,
      lastName,
      password: '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ', // hashed 'Password123!'
      role: overrides.role || UserRole.STUDENT,
      status: overrides.status || UserStatus.ACTIVE,
      isEmailVerified: overrides.isEmailVerified !== undefined ? overrides.isEmailVerified : true,
      lastLoginAt: this.randomDate(),
      createdAt: this.randomDate(),
      updatedAt: new Date(),
    } as User;
  }

  /**
   * Create admin user
   */
  async createAdmin(): Promise<User> {
    return await this.create({
      role: UserRole.ADMIN,
      isEmailVerified: true,
    });
  }

  /**
   * Create instructor users
   */
  async createInstructors(count: number): Promise<User[]> {
    return await this.createMany(count, {
      role: UserRole.INSTRUCTOR,
      isEmailVerified: true,
    });
  }

  /**
   * Create student users
   */
  async createStudents(count: number): Promise<User[]> {
    return await this.createMany(count, {
      role: UserRole.STUDENT,
      isEmailVerified: true,
    });
  }

  /**
   * Create users with specific role
   */
  async createWithRole(role: UserRole, count: number): Promise<User[]> {
    return await this.createMany(count, {
      role,
      isEmailVerified: true,
    });
  }

  /**
   * Create inactive users
   */
  async createInactive(count: number): Promise<User[]> {
    return await this.createMany(count, {
      status: UserStatus.INACTIVE,
      isEmailVerified: false,
    });
  }

  /**
   * Create suspended users
   */
  async createSuspended(count: number): Promise<User[]> {
    return await this.createMany(count, {
      status: UserStatus.SUSPENDED,
      isEmailVerified: true,
    });
  }
}
