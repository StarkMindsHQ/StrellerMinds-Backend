import { BaseFactory } from './base.factory';
import { Course } from '../../src/courses/entities/course.entity';
import { CourseStatus } from '../../src/courses/enums/course-status.enum';
import { CourseLevel } from '../../src/courses/enums/course-level.enum';
import { UserFactory } from './user.factory';

export class CourseFactory extends BaseFactory<Course> {
  private userFactory = new UserFactory();

  protected definition(): Partial<Course> {
    const title = this.generateText(1).replace('.', '');

    return {
      id: this.generateId(),
      title,
      slug: this.generateSlug(),
      description: this.generateText(3),
      shortDescription: this.generateText(1),
      thumbnail: this.generateImageUrl(800, 600),
      previewVideo: this.generateUrl(),
      status: CourseStatus.PUBLISHED,
      level: this.pickRandom(Object.values(CourseLevel)),
      price: this.generatePrice(50, 500),
      originalPrice: this.generatePrice(60, 600),
      currency: 'USD',
      duration: this.generateNumber(30, 300), // minutes
      lessonsCount: this.generateNumber(5, 50),
      studentsCount: this.generateNumber(0, 1000),
      rating: parseFloat((Math.random() * 2 + 3).toFixed(1)), // 3.0 - 5.0
      reviewsCount: this.generateNumber(0, 100),
      language: this.pickRandom(['en', 'es', 'fr', 'de']),
      category: this.pickRandom([
        'Programming',
        'Design',
        'Business',
        'Marketing',
        'Photography',
        'Music',
        'Health',
        'Lifestyle',
      ]),
      tags: this.pickRandomMany(
        [
          'beginner',
          'intermediate',
          'advanced',
          'practical',
          'theory',
          'hands-on',
          'certification',
          'popular',
        ],
        this.generateNumber(2, 5),
      ),
      requirements: ['Basic computer skills', 'Internet connection', 'Willingness to learn'],
      whatYouWillLearn: [
        'Master the fundamentals',
        'Build real-world projects',
        'Understand best practices',
        'Gain practical experience',
      ],
      targetAudience: [
        'Beginners looking to start their journey',
        'Professionals wanting to upgrade skills',
        'Students seeking practical knowledge',
      ],
      syllabus: {
        sections: [
          {
            title: 'Introduction',
            lessons: ['Getting Started', 'Course Overview'],
            duration: 30,
          },
          {
            title: 'Fundamentals',
            lessons: ['Basic Concepts', 'Core Principles'],
            duration: 60,
          },
        ],
      },
      instructor: this.userFactory.instructor(),
      isPublished: true,
      isFeatured: false,
      publishedAt: this.generateDate({ past: true }),
      createdAt: this.generateDate({ past: true }),
      updatedAt: this.generateDate({ days: 7 }),
    };
  }

  protected traits = {
    draft: (): Partial<Course> => ({
      status: CourseStatus.DRAFT,
      isPublished: false,
      publishedAt: null,
    }),

    published: (): Partial<Course> => ({
      status: CourseStatus.PUBLISHED,
      isPublished: true,
      publishedAt: this.generateDate({ past: true }),
    }),

    archived: (): Partial<Course> => ({
      status: CourseStatus.ARCHIVED,
      isPublished: false,
      archivedAt: this.generateDate({ past: true }),
    }),

    featured: (): Partial<Course> => ({
      isFeatured: true,
      featuredAt: this.generateDate({ past: true }),
    }),

    free: (): Partial<Course> => ({
      price: 0,
      originalPrice: 0,
    }),

    premium: (): Partial<Course> => ({
      price: this.generatePrice(200, 1000),
      originalPrice: this.generatePrice(250, 1200),
      isPremium: true,
    }),

    popular: (): Partial<Course> => ({
      studentsCount: this.generateNumber(500, 5000),
      rating: parseFloat((Math.random() * 0.5 + 4.5).toFixed(1)), // 4.5 - 5.0
      reviewsCount: this.generateNumber(100, 1000),
      isFeatured: true,
    }),

    beginner: (): Partial<Course> => ({
      level: CourseLevel.BEGINNER,
      duration: this.generateNumber(30, 120),
      lessonsCount: this.generateNumber(5, 20),
    }),

    intermediate: (): Partial<Course> => ({
      level: CourseLevel.INTERMEDIATE,
      duration: this.generateNumber(120, 300),
      lessonsCount: this.generateNumber(20, 40),
    }),

    advanced: (): Partial<Course> => ({
      level: CourseLevel.ADVANCED,
      duration: this.generateNumber(300, 600),
      lessonsCount: this.generateNumber(40, 80),
    }),

    withDiscount: (): Partial<Course> => {
      const originalPrice = this.generatePrice(100, 500);
      const discountPercent = this.generateNumber(10, 50);
      const price = originalPrice * (1 - discountPercent / 100);

      return {
        originalPrice,
        price: parseFloat(price.toFixed(2)),
        discountPercent,
        discountExpiresAt: this.generateDate({ future: true }),
      };
    },

    newCourse: (): Partial<Course> => ({
      createdAt: this.generateDate({ days: 7 }),
      studentsCount: this.generateNumber(0, 50),
      reviewsCount: this.generateNumber(0, 10),
    }),

    programming: (): Partial<Course> => ({
      category: 'Programming',
      tags: ['programming', 'coding', 'development', 'software'],
      requirements: ['Basic computer skills', 'Text editor or IDE', 'Programming language basics'],
    }),

    design: (): Partial<Course> => ({
      category: 'Design',
      tags: ['design', 'creative', 'visual', 'ui/ux'],
      requirements: [
        'Design software (Photoshop, Figma, etc.)',
        'Creative mindset',
        'Basic design principles',
      ],
    }),
  };

  /**
   * Create draft course
   */
  draft(options: any = {}): Course {
    return this.withTrait('draft', options);
  }

  /**
   * Create published course
   */
  published(options: any = {}): Course {
    return this.withTrait('published', options);
  }

  /**
   * Create featured course
   */
  featured(options: any = {}): Course {
    return this.withTrait('featured', options);
  }

  /**
   * Create free course
   */
  free(options: any = {}): Course {
    return this.withTrait('free', options);
  }

  /**
   * Create premium course
   */
  premium(options: any = {}): Course {
    return this.withTrait('premium', options);
  }

  /**
   * Create popular course
   */
  popular(options: any = {}): Course {
    return this.withTrait('popular', options);
  }

  /**
   * Create course with specific instructor
   */
  withInstructor(instructor: any, options: any = {}): Course {
    return this.create({ ...options, overrides: { instructor } });
  }

  /**
   * Create course with specific price
   */
  withPrice(price: number, options: any = {}): Course {
    return this.create({ ...options, overrides: { price } });
  }

  /**
   * Create course catalog
   */
  createCatalog(count: number = 10): Course[] {
    const courses = [];

    // Mix of different types
    courses.push(...this.createMany(3, { traits: ['popular'] }));
    courses.push(...this.createMany(2, { traits: ['featured'] }));
    courses.push(...this.createMany(2, { traits: ['free'] }));
    courses.push(...this.createMany(3, { traits: ['premium'] }));

    return courses.slice(0, count);
  }
}
