import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../../auth/entities/user.entity';
import { BaseFactory } from './base.factory';
import * as bcrypt from 'bcrypt';

export interface UserFactoryOptions {
  role?: UserRole;
  status?: UserStatus;
  isEmailVerified?: boolean;
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
}

/**
 * Enhanced user factory for test data
 */
export class UserFactory extends BaseFactory<User> {
  private static readonly FIRST_NAMES = [
    'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa',
    'James', 'Mary', 'William', 'Patricia', 'Richard', 'Jennifer', 'Thomas',
    'Linda', 'Christopher', 'Barbara', 'Daniel', 'Susan', 'Matthew', 'Jessica',
    'Anthony', 'Ashley', 'Mark', 'Kimberly', 'Donald', 'Emily', 'Steven', 'Donna',
  ];

  private static readonly LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  ];

  protected getRepository(): Repository<User> {
    return this.dataSource.getRepository(User);
  }

  /**
   * Generate user data without persisting
   */
  generate(overrides: UserFactoryOptions = {}): User {
    const firstName = overrides.firstName || this.randomPick(UserFactory.FIRST_NAMES);
    const lastName = overrides.lastName || this.randomPick(UserFactory.LAST_NAMES);
    const email = overrides.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${this.randomString(4)}@test.com`;
    
    return {
      id: this.randomUUID(),
      email,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      password: overrides.password || '$2b$10$hashedPasswordForTesting',
      role: overrides.role || UserRole.STUDENT,
      status: overrides.status || UserStatus.ACTIVE,
      isEmailVerified: overrides.isEmailVerified !== undefined ? overrides.isEmailVerified : true,
      emailVerificationToken: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      lastLoginAt: this.randomDate(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as User;
  }

  /**
   * Create and persist a user
   */
  async create(overrides: UserFactoryOptions = {}): Promise<User> {
    const userData = this.generate(overrides);
    
    // Hash password if provided
    if (overrides.password) {
      userData.password = await bcrypt.hash(overrides.password, 10);
    }
    
    return this.save(userData);
  }

  /**
   * Create admin user
   */
  async createAdmin(overrides: UserFactoryOptions = {}): Promise<User> {
    return this.create({
      ...overrides,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      email: overrides.email || 'admin@test.com',
    });
  }

  /**
   * Create instructor user
   */
  async createInstructor(overrides: UserFactoryOptions = {}): Promise<User> {
    return this.create({
      ...overrides,
      role: UserRole.INSTRUCTOR,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
  }

  /**
   * Create student user
   */
  async createStudent(overrides: UserFactoryOptions = {}): Promise<User> {
    return this.create({
      ...overrides,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
  }

  /**
   * Create multiple admin users
   */
  async createAdmins(count: number, overrides: UserFactoryOptions = {}): Promise<User[]> {
    return this.createMany(count, {
      ...overrides,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
  }

  /**
   * Create multiple instructor users
   */
  async createInstructors(count: number, overrides: UserFactoryOptions = {}): Promise<User[]> {
    return this.createMany(count, {
      ...overrides,
      role: UserRole.INSTRUCTOR,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
  }

  /**
   * Create multiple student users
   */
  async createStudents(count: number, overrides: UserFactoryOptions = {}): Promise<User[]> {
    return this.createMany(count, {
      ...overrides,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
  }

  /**
   * Create user with specific status
   */
  async createWithStatus(status: UserStatus, overrides: UserFactoryOptions = {}): Promise<User> {
    return this.create({
      ...overrides,
      status,
    });
  }

  /**
   * Create unverified user
   */
  async createUnverified(overrides: UserFactoryOptions = {}): Promise<User> {
    return this.create({
      ...overrides,
      isEmailVerified: false,
      emailVerificationToken: this.randomUUID(),
    });
  }

  /**
   * Create suspended user
   */
  async createSuspended(overrides: UserFactoryOptions = {}): Promise<User> {
    return this.create({
      ...overrides,
      status: UserStatus.SUSPENDED,
    });
  }

  /**
   * Create user with password reset token
   */
  async createWithPasswordReset(overrides: UserFactoryOptions = {}): Promise<User> {
    return this.create({
      ...overrides,
      passwordResetToken: this.randomUUID(),
      passwordResetExpires: new Date(Date.now() + 3600000), // 1 hour from now
    });
  }
}
