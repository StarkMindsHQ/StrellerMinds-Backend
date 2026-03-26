import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TestDatabaseService } from '../services/test-database.service';
import { UserFactory } from './user.factory';
import { CourseFactory } from './course.factory';
import { AssignmentFactory } from './assignment.factory';
import { PaymentFactory } from './payment.factory';
import { ForumFactory } from './forum.factory';
import { GamificationFactory } from './gamification.factory';

@Injectable()
export class TestDataFactory {
  private readonly logger = new Logger(TestDataFactory.name);

  constructor(
    private readonly testDatabaseService: TestDatabaseService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get user factory instance
   */
  get users(): UserFactory {
    return new UserFactory(this.dataSource);
  }

  /**
   * Get course factory instance
   */
  get courses(): CourseFactory {
    return new CourseFactory(this.dataSource);
  }

  /**
   * Get assignment factory instance
   */
  get assignments(): AssignmentFactory {
    return new AssignmentFactory(this.dataSource);
  }

  /**
   * Get payment factory instance
   */
  get payments(): PaymentFactory {
    return new PaymentFactory(this.dataSource);
  }

  /**
   * Get forum factory instance
   */
  get forums(): ForumFactory {
    return new ForumFactory(this.dataSource);
  }

  /**
   * Get gamification factory instance
   */
  get gamification(): GamificationFactory {
    return new GamificationFactory(this.dataSource);
  }

  /**
   * Create a complete test scenario with related entities
   */
  async createTestScenario(options: {
    userCount?: number;
    courseCount?: number;
    assignmentCount?: number;
    paymentCount?: number;
    forumCount?: number;
  } = {}): Promise<{
    users: any[];
    courses: any[];
    assignments: any[];
    payments: any[];
    forums: any[];
  }> {
    const {
      userCount = 10,
      courseCount = 5,
      assignmentCount = 20,
      paymentCount = 15,
      forumCount = 3,
    } = options;

    this.logger.log(`Creating test scenario with ${userCount} users, ${courseCount} courses...`);

    // Create users
    const adminUser = await this.users.createAdmin();
    const instructors = await this.users.createInstructors(Math.floor(userCount * 0.2));
    const students = await this.users.createStudents(Math.floor(userCount * 0.7));
    const allUsers = [adminUser, ...instructors, ...students];

    // Create courses
    const courses = await this.courses.createMany(courseCount, {
      instructorIds: instructors.map(i => i.id),
    });

    // Create assignments
    const assignments = await this.assignments.createMany(assignmentCount, {
      courseIds: courses.map(c => c.id),
      instructorIds: instructors.map(i => i.id),
    });

    // Create payments
    const payments = await this.payments.createMany(paymentCount, {
      userIds: students.map(s => s.id),
    });

    // Create forums
    const forums = await this.forums.createMany(forumCount, {
      courseIds: courses.map(c => c.id),
    });

    // Create gamification profiles
    await this.gamification.createProfilesForUsers(allUsers);

    this.logger.log('Test scenario created successfully');

    return {
      users: allUsers,
      courses,
      assignments,
      payments,
      forums,
    };
  }

  /**
   * Create minimal test data for unit tests
   */
  async createMinimalTestData(): Promise<{
    admin: any;
    instructor: any;
    student: any;
    course: any;
  }> {
    this.logger.log('Creating minimal test data...');

    const admin = await this.users.createAdmin();
    const instructor = await this.users.createInstructor();
    const student = await this.users.createStudent();
    
    const course = await this.courses.create({
      instructorId: instructor.id,
      title: 'Test Course',
    });

    this.logger.log('Minimal test data created');

    return {
      admin,
      instructor,
      student,
      course,
    };
  }

  /**
   * Generate test data without persisting to database
   */
  generateTestData(count: number = 1): any[] {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({
        id: `test_${i}`,
        name: `Test Entity ${i}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return data;
  }
}
