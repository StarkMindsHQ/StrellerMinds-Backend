import { BaseFactory } from './base.factory';
import { Enrollment, EnrollmentStatus } from '../../course/entities/enrollment.entity';
import { Course } from '../../course/entities/course.entity';
import { User } from '../../auth/entities/user.entity';

export interface EnrollmentFactoryOptions {
  user?: User;
  course?: Course;
  status?: EnrollmentStatus;
  enrolledAt?: Date;
  completedAt?: Date;
  progress?: number;
}

/**
 * Factory for generating enrollment test data
 */
export class EnrollmentFactory extends BaseFactory<Enrollment> {
  protected getRepository() {
    return this.dataSource.getRepository(Enrollment);
  }

  async create(overrides: EnrollmentFactoryOptions = {}): Promise<Enrollment> {
    const enrollmentData = this.generate(overrides);
    return await this.save(enrollmentData);
  }

  generate(overrides: EnrollmentFactoryOptions = {}): Enrollment {
    const status = overrides.status || this.randomPick(Object.values(EnrollmentStatus));
    const enrolledAt = overrides.enrolledAt || this.randomDate();
    
    let completedAt: Date | null = null;
    let progress = 0;

    if (status === EnrollmentStatus.COMPLETED) {
      completedAt = overrides.completedAt || this.randomDate(enrolledAt);
      progress = 100;
    } else if (status === EnrollmentStatus.IN_PROGRESS) {
      progress = this.randomNumber(1, 99);
    } else if (status === EnrollmentStatus.DROPPED) {
      progress = this.randomNumber(0, 50);
    }

    return {
      id: this.randomUUID(),
      user: overrides.user || null,
      course: overrides.course || null,
      status,
      enrolledAt,
      completedAt,
      progress,
      grade: status === EnrollmentStatus.COMPLETED ? this.randomNumber(60, 100) : null,
      certificateUrl: status === EnrollmentStatus.COMPLETED ? `https://certificates.strellerminds.com/${this.randomUUID()}.pdf` : null,
      lastAccessedAt: this.randomDate(enrolledAt),
      createdAt: enrolledAt,
      updatedAt: new Date(),
    } as Enrollment;
  }

  /**
   * Create active enrollments
   */
  async createActive(count: number, overrides: EnrollmentFactoryOptions = {}): Promise<Enrollment[]> {
    return await this.createMany(count, {
      ...overrides,
      status: EnrollmentStatus.ACTIVE,
    });
  }

  /**
   * Create in-progress enrollments
   */
  async createInProgress(count: number, overrides: EnrollmentFactoryOptions = {}): Promise<Enrollment[]> {
    return await this.createMany(count, {
      ...overrides,
      status: EnrollmentStatus.IN_PROGRESS,
    });
  }

  /**
   * Create completed enrollments
   */
  async createCompleted(count: number, overrides: EnrollmentFactoryOptions = {}): Promise<Enrollment[]> {
    return await this.createMany(count, {
      ...overrides,
      status: EnrollmentStatus.COMPLETED,
    });
  }

  /**
   * Create dropped enrollments
   */
  async createDropped(count: number, overrides: EnrollmentFactoryOptions = {}): Promise<Enrollment[]> {
    return await this.createMany(count, {
      ...overrides,
      status: EnrollmentStatus.DROPPED,
    });
  }

  /**
   * Generate enrollment data for specific user and course
   */
  generateForUserAndCourse(user: User, course: Course, status?: EnrollmentStatus): Enrollment {
    return this.generate({
      user,
      course,
      status,
    });
  }
}
