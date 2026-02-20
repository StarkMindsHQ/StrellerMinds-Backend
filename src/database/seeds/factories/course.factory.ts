import { Course } from '../../../course/entities/course.entity';
import { CourseStatus } from '../../../course/entities/course.entity';

export interface CourseFactoryOptions {
  instructorId?: string;
  status?: CourseStatus;
  count?: number;
}

/**
 * Factory for generating course seed data
 */
export class CourseFactory {
  private static readonly COURSE_TITLES = [
    'Introduction to Blockchain Technology',
    'Smart Contracts with Solidity',
    'Decentralized Finance (DeFi) Fundamentals',
    'NFT Development Masterclass',
    'Cryptocurrency Trading Strategies',
    'Web3 Development with React',
    'Ethereum Development Bootcamp',
    'Blockchain Security Best Practices',
    'Building DAOs: Theory and Practice',
    'Stellar Network Development',
    'Advanced Soroban Smart Contracts',
    'Blockchain for Business',
    'Cryptography Fundamentals',
    'Token Economics and Design',
    'Layer 2 Scaling Solutions',
  ];

  private static readonly LEVELS = ['beginner', 'intermediate', 'advanced'];
  private static readonly LANGUAGES = ['English', 'Spanish', 'French', 'German'];

  /**
   * Generate a single course
   */
  static generate(options: CourseFactoryOptions = {}): Partial<Course> {
    const title = this.randomElement(this.COURSE_TITLES);
    const level = this.randomElement(this.LEVELS);
    const language = this.randomElement(this.LANGUAGES);

    return {
      title: `${title} - ${level}`,
      subtitle: `Master ${title.toLowerCase()} with hands-on projects`,
      description: this.generateDescription(title),
      level,
      language,
      durationMinutes: Math.floor(Math.random() * 600) + 120, // 2-12 hours
      status: options.status || CourseStatus.PUBLISHED,
      instructorId: options.instructorId,
      price: parseFloat((Math.random() * 200 + 29.99).toFixed(2)),
      currency: 'USD',
      publishedAt: options.status === CourseStatus.PUBLISHED ? new Date() : null,
    };
  }

  /**
   * Generate multiple courses
   */
  static generateMany(count: number, options: CourseFactoryOptions = {}): Partial<Course>[] {
    const courses: Partial<Course>[] = [];
    for (let i = 0; i < count; i++) {
      courses.push(this.generate(options));
    }
    return courses;
  }

  /**
   * Generate description for a course
   */
  private static generateDescription(title: string): string {
    return `
This comprehensive course on ${title} will take you from beginner to advanced level.
You'll learn through hands-on projects and real-world examples.

What you'll learn:
- Core concepts and fundamentals
- Practical implementation techniques
- Industry best practices
- Real-world project development

Perfect for developers, entrepreneurs, and blockchain enthusiasts looking to expand their knowledge.
    `.trim();
  }

  private static randomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}
