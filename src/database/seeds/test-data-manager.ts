import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { BaseFactory } from './factories/base.factory';
import { UserFactory } from './factories/user.factory';
import { CourseFactory } from './factories/course.factory';
import { PaymentFactory } from './factories/payment.factory';
import { EnrollmentFactory } from './factories/enrollment.factory';
import { GamificationFactory } from './factories/gamification.factory';
import { AssignmentFactory } from './factories/assignment.factory';
import { ForumPostFactory, ForumTopicFactory } from './factories/forum.factory';

export interface TestDataOptions {
  isolation?: boolean;
  cleanup?: boolean;
  version?: string;
  dataset?: 'minimal' | 'standard' | 'full';
  transaction?: boolean;
}

export interface TestDataSet {
  users?: any[];
  courses?: any[];
  payments?: any[];
  enrollments?: any[];
  gamificationProfiles?: any[];
  assignments?: any[];
  forumPosts?: any[];
  forumTopics?: any[];
}

/**
 * Professional test data management system
 * 
 * Features:
 * - Test data isolation
 * - Automatic cleanup
 * - Data versioning
 * - Transaction support
 * - Factory-based generation
 * - Dataset management
 */
export class TestDataManager {
  private readonly logger = new Logger(TestDataManager.name);
  private readonly factories: Map<string, BaseFactory<any>>;
  private readonly testData: Map<string, TestDataSet> = new Map();
  private readonly activeTransactions: Map<string, any> = new Map();

  constructor(private dataSource: DataSource) {
    this.factories = new Map([
      ['user', new UserFactory(dataSource)],
      ['course', new CourseFactory(dataSource)],
      ['payment', new PaymentFactory(dataSource)],
      ['enrollment', new EnrollmentFactory(dataSource)],
      ['gamification', new GamificationFactory(dataSource)],
      ['assignment', new AssignmentFactory(dataSource)],
      ['forumPost', new ForumPostFactory(dataSource)],
      ['forumTopic', new ForumTopicFactory(dataSource)],
    ]);
  }

  /**
   * Create isolated test data for a specific test
   */
  async createTestData(testId: string, options: TestDataOptions = {}): Promise<TestDataSet> {
    const {
      isolation = true,
      cleanup = true,
      version = '1.0.0',
      dataset = 'minimal',
      transaction = true,
    } = options;

    this.logger.log(`🧪 Creating test data for test: ${testId}`);

    let queryRunner: any = null;
    if (transaction) {
      queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      this.activeTransactions.set(testId, queryRunner);
    }

    try {
      const testData: TestDataSet = {};

      // Generate data based on dataset size
      switch (dataset) {
        case 'minimal':
          await this.generateMinimalDataset(testData);
          break;
        case 'standard':
          await this.generateStandardDataset(testData);
          break;
        case 'full':
          await this.generateFullDataset(testData);
          break;
      }

      // Store test data for cleanup
      if (cleanup) {
        this.testData.set(testId, testData);
      }

      // Add metadata
      (testData as any).metadata = {
        testId,
        version,
        dataset,
        createdAt: new Date(),
        isolation,
        cleanup,
      };

      this.logger.log(`✅ Test data created for ${testId}: ${this.getEntityCount(testData)} entities`);

      return testData;
    } catch (error) {
      if (queryRunner) {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
        this.activeTransactions.delete(testId);
      }
      this.logger.error(`❌ Failed to create test data for ${testId}:`, error);
      throw error;
    }
  }

  /**
   * Generate minimal dataset
   */
  private async generateMinimalDataset(testData: TestDataSet): Promise<void> {
    const userFactory = this.factories.get('user') as UserFactory;
    const courseFactory = this.factories.get('course') as CourseFactory;

    // Create users
    const admin = await userFactory.createAdmin();
    const instructors = await userFactory.createInstructors(2);
    const students = await userFactory.createStudents(5);

    testData.users = [admin, ...instructors, ...students];

    // Create courses
    const courses = await courseFactory.createMany(3, { instructor: instructors[0] });
    testData.courses = courses;
  }

  /**
   * Generate standard dataset
   */
  private async generateStandardDataset(testData: TestDataSet): Promise<void> {
    const userFactory = this.factories.get('user') as UserFactory;
    const courseFactory = this.factories.get('course') as CourseFactory;
    const enrollmentFactory = this.factories.get('enrollment') as EnrollmentFactory;
    const gamificationFactory = this.factories.get('gamification') as GamificationFactory;
    const assignmentFactory = this.factories.get('assignment') as AssignmentFactory;

    // Create users
    const admin = await userFactory.createAdmin();
    const instructors = await userFactory.createInstructors(5);
    const students = await userFactory.createStudents(20);

    testData.users = [admin, ...instructors, ...students];

    // Create courses
    const courses = await courseFactory.createMany(15);
    testData.courses = courses;

    // Create enrollments
    const enrollments: any[] = [];
    for (const student of students) {
      const studentCourses = this.randomPickMany(courses, this.randomNumber(1, 5));
      for (const course of studentCourses) {
        enrollments.push(await enrollmentFactory.create({ user: student, course }));
      }
    }
    testData.enrollments = enrollments;

    // Create gamification profiles
    const gamificationProfiles: any[] = [];
    for (const student of students) {
      gamificationProfiles.push(await gamificationFactory.create({ user: student }));
    }
    testData.gamificationProfiles = gamificationProfiles;

    // Create assignments
    const assignments: any[] = [];
    for (const course of courses.slice(0, 10)) {
      assignments.push(await assignmentFactory.create());
      assignments.push(await assignmentFactory.createQuiz());
    }
    testData.assignments = assignments;
  }

  /**
   * Generate full dataset
   */
  private async generateFullDataset(testData: TestDataSet): Promise<void> {
    const userFactory = this.factories.get('user') as UserFactory;
    const courseFactory = this.factories.get('course') as CourseFactory;
    const enrollmentFactory = this.factories.get('enrollment') as EnrollmentFactory;
    const gamificationFactory = this.factories.get('gamification') as GamificationFactory;
    const assignmentFactory = this.factories.get('assignment') as AssignmentFactory;
    const forumPostFactory = this.factories.get('forumPost') as ForumPostFactory;
    const forumTopicFactory = this.factories.get('forumTopic') as ForumTopicFactory;
    const paymentFactory = this.factories.get('payment') as PaymentFactory;

    // Create users
    const admin = await userFactory.createAdmin();
    const instructors = await userFactory.createInstructors(10);
    const students = await userFactory.createStudents(50);

    testData.users = [admin, ...instructors, ...students];

    // Create courses
    const courses = await courseFactory.createMany(30);
    testData.courses = courses;

    // Create enrollments
    const enrollments: any[] = [];
    for (const student of students) {
      const studentCourses = this.randomPickMany(courses, this.randomNumber(1, 8));
      for (const course of studentCourses) {
        enrollments.push(await enrollmentFactory.create({ user: student, course }));
      }
    }
    testData.enrollments = enrollments;

    // Create gamification profiles
    const gamificationProfiles: any[] = [];
    for (const student of students) {
      gamificationProfiles.push(await gamificationFactory.create({ user: student }));
    }
    testData.gamificationProfiles = gamificationProfiles;

    // Create assignments
    const assignments: any[] = [];
    for (const course of courses) {
      const assignmentCount = this.randomNumber(1, 5);
      for (let i = 0; i < assignmentCount; i++) {
        assignments.push(await assignmentFactory.create());
      }
    }
    testData.assignments = assignments;

    // Create forum topics and posts
    const forumTopics: any[] = [];
    const forumPosts: any[] = [];
    
    for (const course of courses.slice(0, 20)) {
      const topic = await forumTopicFactory.createForCourse(course);
      forumTopics.push(topic);

      // Create posts for each topic
      const postCount = this.randomNumber(5, 20);
      for (let i = 0; i < postCount; i++) {
        const author = this.randomPick([...students, ...instructors]);
        forumPosts.push(await forumPostFactory.create({ 
          author, 
          course, 
          topic,
          title: `Discussion Post ${i + 1} for ${course.title}`
        }));
      }
    }
    testData.forumTopics = forumTopics;
    testData.forumPosts = forumPosts;

    // Create payments
    const payments: any[] = [];
    for (const student of students.slice(0, 30)) {
      const studentCourses = this.randomPickMany(courses, this.randomNumber(1, 3));
      for (const course of studentCourses) {
        payments.push(await paymentFactory.create({ user: student, course }));
      }
    }
    testData.payments = payments;
  }

  /**
   * Cleanup test data for a specific test
   */
  async cleanupTestData(testId: string): Promise<void> {
    this.logger.log(`🧹 Cleaning up test data for: ${testId}`);

    const testData = this.testData.get(testId);
    if (!testData) {
      this.logger.warn(`No test data found for test: ${testId}`);
      return;
    }

    const queryRunner = this.activeTransactions.get(testId);
    try {
      if (queryRunner) {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
        this.activeTransactions.delete(testId);
      } else {
        // Manual cleanup if no transaction
        await this.manualCleanup(testData);
      }

      this.testData.delete(testId);
      this.logger.log(`✅ Test data cleaned up for: ${testId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to cleanup test data for ${testId}:`, error);
      throw error;
    }
  }

  /**
   * Manual cleanup when not using transactions
   */
  private async manualCleanup(testData: TestDataSet): Promise<void> {
    const cleanupOrder = [
      'forumPosts',
      'forumTopics',
      'enrollments',
      'gamificationProfiles',
      'payments',
      'assignments',
      'courses',
      'users',
    ];

    for (const entityType of cleanupOrder) {
      const entities = testData[entityType as keyof TestDataSet];
      if (entities && entities.length > 0) {
        const repository = this.dataSource.getRepository(this.getEntityType(entityType));
        await repository.delete(entities.map((e: any) => e.id));
      }
    }
  }

  /**
   * Cleanup all test data
   */
  async cleanupAllTestData(): Promise<void> {
    this.logger.log('🧹 Cleaning up all test data');

    const testIds = Array.from(this.testData.keys());
    for (const testId of testIds) {
      await this.cleanupTestData(testId);
    }

    this.logger.log('✅ All test data cleaned up');
  }

  /**
   * Get test data for a specific test
   */
  getTestData(testId: string): TestDataSet | undefined {
    return this.testData.get(testId);
  }

  /**
   * Get entity type for cleanup
   */
  private getEntityType(entityType: string): any {
    const typeMap: { [key: string]: any } = {
      users: 'User',
      courses: 'Course',
      payments: 'Payment',
      enrollments: 'Enrollment',
      gamificationProfiles: 'GamificationProfile',
      assignments: 'Assignment',
      forumPosts: 'ForumPost',
      forumTopics: 'ForumTopic',
    };

    return typeMap[entityType] || entityType;
  }

  /**
   * Count entities in test data
   */
  private getEntityCount(testData: TestDataSet): number {
    return Object.values(testData).reduce((count, entities) => {
      return count + (Array.isArray(entities) ? entities.length : 0);
    }, 0);
  }

  /**
   * Random pick helper
   */
  private randomPick<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Random pick many helper
   */
  private randomPickMany<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, array.length));
  }

  /**
   * Random number helper
   */
  private randomNumber(min: number = 0, max: number = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
