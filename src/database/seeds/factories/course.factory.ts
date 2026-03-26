import { BaseFactory } from './base.factory';
import { Course, CourseStatus } from '../../../course/entities/course.entity';
import { User } from '../../../auth/entities/user.entity';
import { DataSource } from 'typeorm';

export interface CourseFactoryOptions {
  instructor?: User;
  status?: CourseStatus;
  count?: number;
}

/**
 * Factory for generating course test data
 */
export class CourseFactory extends BaseFactory<Course> {
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

  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  protected getRepository() {
    return this.dataSource.getRepository(Course);
  }

  async create(overrides: CourseFactoryOptions = {}): Promise<Course> {
    const courseData = this.generate(overrides);
    return await this.save(courseData);
  }

  generate(overrides: CourseFactoryOptions = {}): Course {
    const title = this.randomPick(CourseFactory.COURSE_TITLES);
    const level = this.randomPick(CourseFactory.LEVELS);
    const language = this.randomPick(CourseFactory.LANGUAGES);

    return {
      id: this.randomUUID(),
      title: `${title} - ${level}`,
      subtitle: `Master ${title.toLowerCase()} with hands-on projects`,
      description: this.generateDescription(title),
      level,
      language,
      durationMinutes: this.randomNumber(120, 720), // 2-12 hours
      status: overrides.status || CourseStatus.PUBLISHED,
      instructor: overrides.instructor || null,
      price: this.randomNumber(0, 500),
      currency: 'USD',
      maxStudents: this.randomNumber(10, 100),
      currentStudents: 0,
      rating: this.randomNumber(3, 5) + Math.random(),
      reviewCount: this.randomNumber(0, 100),
      thumbnailUrl: `https://thumbnails.strellerminds.com/${this.randomUUID()}.jpg`,
      previewVideoUrl: `https://videos.strellerminds.com/${this.randomUUID()}.mp4`,
      tags: this.generateTags(title),
      requirements: this.generateRequirements(level),
      objectives: this.generateObjectives(title),
      createdAt: this.randomDate(),
      updatedAt: new Date(),
    } as Course;
  }

  /**
   * Generate course description
   */
  private generateDescription(title: string): string {
    return `Comprehensive course on ${title.toLowerCase()}. Learn from industry experts with hands-on projects and real-world applications.`;
  }

  /**
   * Generate course tags
   */
  private generateTags(title: string): string[] {
    const allTags = [
      'blockchain', 'cryptocurrency', 'smart-contracts', 'defi', 'nft',
      'web3', 'ethereum', 'solidity', 'trading', 'development',
      'security', 'dao', 'stellar', 'soroban', 'business',
    ];

    const titleWords = title.toLowerCase().split(' ');
    const relevantTags = allTags.filter(tag => 
      titleWords.some(word => tag.includes(word) || word.includes(tag))
    );

    return this.randomPickMany(relevantTags.length > 0 ? relevantTags : allTags, 3);
  }

  /**
   * Generate course requirements
   */
  private generateRequirements(level: string): string[] {
    const baseRequirements = [
      'Basic computer skills',
      'Internet connection',
      'Willingness to learn',
    ];

    if (level === 'intermediate' || level === 'advanced') {
      baseRequirements.push('Basic programming knowledge');
    }

    if (level === 'advanced') {
      baseRequirements.push('Experience with blockchain concepts');
    }

    return baseRequirements;
  }

  /**
   * Generate course objectives
   */
  private generateObjectives(title: string): string[] {
    return [
      `Understand fundamental concepts of ${title.toLowerCase()}`,
      `Apply practical skills in real-world scenarios`,
      `Build confidence in ${title.toLowerCase()} implementation`,
      `Create portfolio-ready projects`,
    ];
  }

  /**
   * Create beginner courses
   */
  async createBeginnerCourses(count: number): Promise<Course[]> {
    return await this.createMany(count, {
      status: CourseStatus.PUBLISHED,
    });
  }

  /**
   * Create advanced courses
   */
  async createAdvancedCourses(count: number): Promise<Course[]> {
    return await this.createMany(count, {
      status: CourseStatus.PUBLISHED,
    });
  }

  /**
   * Create draft courses
   */
  async createDraftCourses(count: number): Promise<Course[]> {
    return await this.createMany(count, {
      status: CourseStatus.DRAFT,
    });
  }

  /**
   * Create archived courses
   */
  async createArchivedCourses(count: number): Promise<Course[]> {
    return await this.createMany(count, {
      status: CourseStatus.ARCHIVED,
    });
  }
}
