import { Repository } from 'typeorm';
import { Course } from '../../course/entities/course.entity';
import { BaseFactory } from './base.factory';

export interface CourseFactoryOptions {
  title?: string;
  description?: string;
  instructorId?: string;
  category?: string;
  level?: string;
  price?: number;
  isPublished?: boolean;
  instructorIds?: string[];
}

/**
 * Enhanced course factory for test data
 */
export class CourseFactory extends BaseFactory<Course> {
  private static readonly TITLES = [
    'Introduction to Programming',
    'Advanced Web Development',
    'Database Design Fundamentals',
    'Machine Learning Basics',
    'Cloud Computing Essentials',
    'Mobile App Development',
    'Cybersecurity Fundamentals',
    'Data Science Introduction',
    'DevOps Practices',
    'UI/UX Design Principles',
  ];

  private static readonly DESCRIPTIONS = [
    'Learn the fundamentals of modern software development.',
    'Master advanced concepts and best practices in enterprise applications.',
    'Build scalable and efficient database solutions.',
    'Explore cutting-edge technologies and frameworks.',
    'Develop practical skills through hands-on projects.',
  ];

  private static readonly CATEGORIES = [
    'Programming', 'Web Development', 'Database', 'Machine Learning',
    'Cloud Computing', 'Mobile Development', 'Cybersecurity', 'Data Science',
    'DevOps', 'Design', 'Business', 'Marketing',
  ];

  private static readonly LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

  protected getRepository(): Repository<Course> {
    return this.dataSource.getRepository(Course);
  }

  /**
   * Generate course data without persisting
   */
  generate(overrides: CourseFactoryOptions = {}): Course {
    const title = overrides.title || this.randomPick(CourseFactory.TITLES);
    const description = overrides.description || this.randomPick(CourseFactory.DESCRIPTIONS);
    const category = overrides.category || this.randomPick(CourseFactory.CATEGORIES);
    const level = overrides.level || this.randomPick(CourseFactory.LEVELS);
    
    return {
      id: this.randomUUID(),
      title,
      description,
      category,
      level,
      price: overrides.price ?? this.randomNumber(0, 200),
      isPublished: overrides.isPublished ?? this.randomBoolean(),
      instructorId: overrides.instructorId || this.randomUUID(),
      thumbnail: null,
      duration: this.randomNumber(1, 100),
      enrolledCount: 0,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as Course;
  }

  /**
   * Create and persist a course
   */
  async create(overrides: CourseFactoryOptions = {}): Promise<Course> {
    const courseData = this.generate(overrides);
    return this.save(courseData);
  }

  /**
   * Create multiple courses
   */
  async createMany(count: number, overrides: CourseFactoryOptions = {}): Promise<Course[]> {
    const courses: Course[] = [];
    
    for (let i = 0; i < count; i++) {
      const instructorId = overrides.instructorIds 
        ? this.randomPick(overrides.instructorIds)
        : overrides.instructorId;
        
      courses.push(await this.create({
        ...overrides,
        instructorId,
      }));
    }
    
    return courses;
  }

  /**
   * Create published course
   */
  async createPublished(overrides: CourseFactoryOptions = {}): Promise<Course> {
    return this.create({
      ...overrides,
      isPublished: true,
    });
  }

  /**
   * Create draft course
   */
  async createDraft(overrides: CourseFactoryOptions = {}): Promise<Course> {
    return this.create({
      ...overrides,
      isPublished: false,
    });
  }

  /**
   * Create free course
   */
  async createFree(overrides: CourseFactoryOptions = {}): Promise<Course> {
    return this.create({
      ...overrides,
      price: 0,
    });
  }

  /**
   * Create premium course
   */
  async createPremium(overrides: CourseFactoryOptions = {}): Promise<Course> {
    return this.create({
      ...overrides,
      price: this.randomNumber(50, 200),
    });
  }

  /**
   * Create course with specific category
   */
  async createWithCategory(category: string, overrides: CourseFactoryOptions = {}): Promise<Course> {
    return this.create({
      ...overrides,
      category,
    });
  }

  /**
   * Create course with specific level
   */
  async createWithLevel(level: string, overrides: CourseFactoryOptions = {}): Promise<Course> {
    return this.create({
      ...overrides,
      level,
    });
  }
}
