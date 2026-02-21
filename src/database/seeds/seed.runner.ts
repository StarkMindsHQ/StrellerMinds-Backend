import { DataSource } from 'typeorm';
import { UserFactory } from './factories/user.factory';
import { CourseFactory } from './factories/course.factory';
import { PaymentFactory } from './factories/payment.factory';
import { User } from '../../auth/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { Payment } from '../../payment/entities/payment.entity';
import { Enrollment, EnrollmentStatus } from '../../course/entities/enrollment.entity';
import { GamificationProfile } from '../../gamification/entities/gamification-profile.entity';
import { Logger } from '@nestjs/common';

export enum SeedDataSet {
  MINIMAL = 'minimal',
  STANDARD = 'standard',
  FULL = 'full',
}

export interface SeedOptions {
  dataSet?: SeedDataSet;
  reset?: boolean;
}

/**
 * Main seed runner for populating database with test data
 */
export class SeedRunner {
  private readonly logger = new Logger(SeedRunner.name);
  constructor(private dataSource: DataSource) {}

  /**
   * Run seeds based on options
   */
  async run(options: SeedOptions = {}): Promise<void> {
    const { dataSet = SeedDataSet.STANDARD, reset = false } = options;

    this.logger.log(`🌱 Starting seed process with ${dataSet} dataset...`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Reset database if requested
      if (reset) {
        this.logger.log('🗑️  Clearing existing data...');
        await this.clearData(queryRunner);
      }

      // Seed based on dataset size
      switch (dataSet) {
        case SeedDataSet.MINIMAL:
          await this.seedMinimal(queryRunner);
          break;
        case SeedDataSet.STANDARD:
          await this.seedStandard(queryRunner);
          break;
        case SeedDataSet.FULL:
          await this.seedFull(queryRunner);
          break;
      }

      await queryRunner.commitTransaction();
      this.logger.log('✅ Seed process completed successfully!');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('❌ Seed process failed:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Clear all data from tables
   */
  private async clearData(queryRunner: any): Promise<void> {
    // Order matters due to foreign keys
    await queryRunner.query('TRUNCATE TABLE enrollments CASCADE');
    await queryRunner.query('TRUNCATE TABLE payments CASCADE');
    await queryRunner.query('TRUNCATE TABLE gamification_profiles CASCADE');
    await queryRunner.query('TRUNCATE TABLE courses CASCADE');
    await queryRunner.query('TRUNCATE TABLE users CASCADE');
  }

  /**
   * Seed minimal dataset (1 admin, 2 instructors, 5 students, 3 courses)
   */
  private async seedMinimal(queryRunner: any): Promise<void> {
    this.logger.log('📦 Seeding minimal dataset...');

    // Create users
    const admin = await this.createUser(queryRunner, await UserFactory.generateAdmin());
    const instructors = await this.createUsers(
      queryRunner,
      await UserFactory.generateInstructors(2),
    );
    const students = await this.createUsers(queryRunner, await UserFactory.generateStudents(5));

    // Create courses
    const courses = await this.createCourses(queryRunner, instructors, 3);

    // Create enrollments
    await this.createEnrollments(queryRunner, students, courses, 0.6);

    // Create gamification profiles
    await this.createGamificationProfiles(queryRunner, [...students, ...instructors, admin]);

    this.logger.log(`✓ Created ${1 + instructors.length + students.length} users`);
    this.logger.log(`✓ Created ${courses.length} courses`);
  }

  /**
   * Seed standard dataset (1 admin, 5 instructors, 20 students, 15 courses)
   */
  private async seedStandard(queryRunner: any): Promise<void> {
    this.logger.log('📦 Seeding standard dataset...');

    const admin = await this.createUser(queryRunner, await UserFactory.generateAdmin());
    const instructors = await this.createUsers(
      queryRunner,
      await UserFactory.generateInstructors(5),
    );
    const students = await this.createUsers(queryRunner, await UserFactory.generateStudents(20));

    const courses = await this.createCourses(queryRunner, instructors, 15);
    await this.createEnrollments(queryRunner, students, courses, 0.4);
    await this.createGamificationProfiles(queryRunner, [...students, ...instructors, admin]);
    await this.createPayments(queryRunner, students, 30);

    this.logger.log(`✓ Created ${1 + instructors.length + students.length} users`);
    this.logger.log(`✓ Created ${courses.length} courses`);
    this.logger.log(`✓ Created enrollments and payments`);
  }

  /**
   * Seed full dataset (1 admin, 10 instructors, 50 students, 30 courses)
   */
  private async seedFull(queryRunner: any): Promise<void> {
    this.logger.log('📦 Seeding full dataset...');

    const admin = await this.createUser(queryRunner, await UserFactory.generateAdmin());
    const instructors = await this.createUsers(
      queryRunner,
      await UserFactory.generateInstructors(10),
    );
    const students = await this.createUsers(queryRunner, await UserFactory.generateStudents(50));

    const courses = await this.createCourses(queryRunner, instructors, 30);
    await this.createEnrollments(queryRunner, students, courses, 0.3);
    await this.createGamificationProfiles(queryRunner, [...students, ...instructors, admin]);
    await this.createPayments(queryRunner, students, 100);

    this.logger.log(`✓ Created ${1 + instructors.length + students.length} users`);
    this.logger.log(`✓ Created ${courses.length} courses`);
    this.logger.log(`✓ Created enrollments and payments`);
  }

  /**
   * Create a single user
   */
  private async createUser(queryRunner: any, userData: Partial<User>): Promise<User> {
    const result = await queryRunner.manager.save(User, userData);
    return result;
  }

  /**
   * Create multiple users
   */
  private async createUsers(queryRunner: any, usersData: Partial<User>[]): Promise<User[]> {
    const results = await queryRunner.manager.save(User, usersData);
    return results;
  }

  /**
   * Create courses
   */
  private async createCourses(
    queryRunner: any,
    instructors: User[],
    count: number,
  ): Promise<Course[]> {
    const coursesData = [];
    for (let i = 0; i < count; i++) {
      const instructor = instructors[i % instructors.length];
      coursesData.push(CourseFactory.generate({ instructorId: instructor.id }));
    }
    return await queryRunner.manager.save(Course, coursesData);
  }

  /**
   * Create enrollments (percentage of students enrolled in each course)
   */
  private async createEnrollments(
    queryRunner: any,
    students: User[],
    courses: Course[],
    enrollmentRate: number,
  ): Promise<void> {
    const enrollments = [];
    for (const course of courses) {
      const enrolledStudents = students
        .filter(() => Math.random() < enrollmentRate)
        .slice(0, Math.floor(students.length * enrollmentRate));

      for (const student of enrolledStudents) {
        enrollments.push({
          studentId: student.id,
          courseId: course.id,
          status: EnrollmentStatus.ACTIVE,
          progress: parseFloat((Math.random() * 100).toFixed(2)),
          lastAccessedAt: new Date(),
        });
      }
    }
    await queryRunner.manager.save(Enrollment, enrollments);
  }

  /**
   * Create gamification profiles for users
   */
  private async createGamificationProfiles(queryRunner: any, users: User[]): Promise<void> {
    const profiles = users.map((user) => ({
      userId: user.id,
      points: Math.floor(Math.random() * 1000),
      xp: Math.floor(Math.random() * 5000),
      level: Math.floor(Math.random() * 10) + 1,
      virtualCurrency: Math.floor(Math.random() * 500),
      currentStreak: Math.floor(Math.random() * 30),
      longestStreak: Math.floor(Math.random() * 60),
      lastActivityDate: new Date(),
    }));
    await queryRunner.manager.save(GamificationProfile, profiles);
  }

  /**
   * Create payments
   */
  private async createPayments(queryRunner: any, users: User[], count: number): Promise<void> {
    const payments = [];
    for (let i = 0; i < count; i++) {
      const user = users[i % users.length];
      payments.push(PaymentFactory.generate({ userId: user.id }));
    }
    await queryRunner.manager.save(Payment, payments);
  }
}
