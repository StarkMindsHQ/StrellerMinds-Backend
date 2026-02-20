import { User, UserRole, UserStatus } from '../../../auth/entities/user.entity';
import * as bcrypt from 'bcrypt';

export interface UserFactoryOptions {
  role?: UserRole;
  status?: UserStatus;
  isEmailVerified?: boolean;
  count?: number;
}

/**
 * Factory for generating user seed data
 */
export class UserFactory {
  private static readonly FIRST_NAMES = [
    'John',
    'Jane',
    'Michael',
    'Sarah',
    'David',
    'Emily',
    'Robert',
    'Lisa',
    'James',
    'Mary',
    'William',
    'Patricia',
    'Richard',
    'Jennifer',
    'Thomas',
    'Linda',
  ];

  private static readonly LAST_NAMES = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Rodriguez',
    'Martinez',
    'Hernandez',
    'Lopez',
    'Gonzalez',
    'Wilson',
    'Anderson',
    'Thomas',
  ];

  /**
   * Generate a single user
   */
  static async generate(options: UserFactoryOptions = {}): Promise<Partial<User>> {
    const firstName = this.randomElement(this.FIRST_NAMES);
    const lastName = this.randomElement(this.LAST_NAMES);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}@example.com`;

    return {
      email,
      firstName,
      lastName,
      password: await bcrypt.hash('Password123!', 10),
      role: options.role || UserRole.STUDENT,
      status: options.status || UserStatus.ACTIVE,
      isEmailVerified: options.isEmailVerified !== undefined ? options.isEmailVerified : true,
      lastLoginAt: new Date(),
    };
  }

  /**
   * Generate multiple users
   */
  static async generateMany(
    count: number,
    options: UserFactoryOptions = {},
  ): Promise<Partial<User>[]> {
    const users: Partial<User>[] = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.generate(options));
    }
    return users;
  }

  /**
   * Generate admin user
   */
  static async generateAdmin(): Promise<Partial<User>> {
    return this.generate({
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
  }

  /**
   * Generate instructor users
   */
  static async generateInstructors(count: number = 5): Promise<Partial<User>[]> {
    return this.generateMany(count, {
      role: UserRole.INSTRUCTOR,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
  }

  /**
   * Generate student users
   */
  static async generateStudents(count: number = 20): Promise<Partial<User>[]> {
    return this.generateMany(count, {
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
  }

  private static randomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}
