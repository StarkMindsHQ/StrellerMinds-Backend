import { BaseFactory } from './base.factory';
import { User } from '../../src/users/entities/user.entity';
import { UserRole } from '../../src/users/enums/user-role.enum';
import * as bcrypt from 'bcrypt';

export class UserFactory extends BaseFactory<User> {
  protected definition(): Partial<User> {
    const firstName = this.generateName().split(' ')[0];
    const lastName = this.generateName().split(' ')[1];

    return {
      id: this.generateId(),
      email: this.generateEmail(),
      password: bcrypt.hashSync('password123', 10),
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      role: UserRole.STUDENT,
      isActive: true,
      isEmailVerified: true,
      avatar: this.generateImageUrl(150, 150),
      bio: this.generateText(2),
      timezone: this.pickRandom(['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo']),
      language: this.pickRandom(['en', 'es', 'fr', 'de']),
      dateOfBirth: this.generateDate({ past: true }),
      phoneNumber: this.generatePhone(),
      address: this.generateAddress(),
      socialLinks: {
        linkedin: this.generateUrl(),
        twitter: this.generateUrl(),
        github: this.generateUrl(),
      },
      preferences: {
        emailNotifications: true,
        pushNotifications: true,
        marketingEmails: false,
        theme: 'light',
        language: 'en',
      },
      lastLoginAt: this.generateDate({ days: 7 }),
      createdAt: this.generateDate({ past: true }),
      updatedAt: this.generateDate({ days: 1 }),
    };
  }

  protected traits = {
    admin: (): Partial<User> => ({
      role: UserRole.ADMIN,
      isEmailVerified: true,
    }),

    instructor: (): Partial<User> => ({
      role: UserRole.INSTRUCTOR,
      isEmailVerified: true,
      bio: 'Experienced instructor with expertise in technology and education.',
    }),

    student: (): Partial<User> => ({
      role: UserRole.STUDENT,
    }),

    unverified: (): Partial<User> => ({
      isEmailVerified: false,
      emailVerificationToken: this.generateId(),
      emailVerificationExpires: this.generateDate({ future: true }),
    }),

    inactive: (): Partial<User> => ({
      isActive: false,
      deactivatedAt: this.generateDate({ past: true }),
    }),

    withoutAvatar: (): Partial<User> => ({
      avatar: null,
    }),

    premium: (): Partial<User> => ({
      subscriptionStatus: 'active',
      subscriptionPlan: 'premium',
      subscriptionExpiresAt: this.generateDate({ future: true }),
    }),

    newUser: (): Partial<User> => ({
      createdAt: this.generateDate({ days: 1 }),
      lastLoginAt: null,
      loginCount: 0,
    }),

    activeUser: (): Partial<User> => ({
      lastLoginAt: this.generateDate({ days: 1 }),
      loginCount: this.generateNumber(10, 100),
    }),

    withResetToken: (): Partial<User> => ({
      passwordResetToken: this.generateId(),
      passwordResetExpires: this.generateDate({ future: true }),
    }),

    withSocialAuth: (): Partial<User> => ({
      googleId: this.generateId(),
      facebookId: this.generateId(),
      appleId: this.generateId(),
    }),

    withCompleteProfile: (): Partial<User> => ({
      bio: this.generateText(3),
      dateOfBirth: this.generateDate({ past: true }),
      phoneNumber: this.generatePhone(),
      address: this.generateAddress(),
      socialLinks: {
        linkedin: this.generateUrl(),
        twitter: this.generateUrl(),
        github: this.generateUrl(),
        website: this.generateUrl(),
      },
    }),
  };

  /**
   * Create admin user
   */
  admin(options: any = {}): User {
    return this.withTrait('admin', options);
  }

  /**
   * Create instructor user
   */
  instructor(options: any = {}): User {
    return this.withTrait('instructor', options);
  }

  /**
   * Create student user
   */
  student(options: any = {}): User {
    return this.withTrait('student', options);
  }

  /**
   * Create unverified user
   */
  unverified(options: any = {}): User {
    return this.withTrait('unverified', options);
  }

  /**
   * Create inactive user
   */
  inactive(options: any = {}): User {
    return this.withTrait('inactive', options);
  }

  /**
   * Create user with specific email
   */
  withEmail(email: string, options: any = {}): User {
    return this.create({ ...options, overrides: { email } });
  }

  /**
   * Create user with specific role
   */
  withRole(role: UserRole, options: any = {}): User {
    return this.create({ ...options, overrides: { role } });
  }

  /**
   * Create multiple users with different roles
   */
  createTeam(): { admin: User; instructor: User; students: User[] } {
    return {
      admin: this.admin(),
      instructor: this.instructor(),
      students: this.createMany(3, { traits: ['student'] }),
    };
  }

  /**
   * Create user for authentication tests
   */
  forAuth(password: string = 'password123'): User {
    return this.create({
      overrides: {
        password: bcrypt.hashSync(password, 10),
        isEmailVerified: true,
        isActive: true,
      },
    });
  }
}
