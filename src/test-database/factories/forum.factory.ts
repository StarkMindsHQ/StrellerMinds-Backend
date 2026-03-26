import { Repository } from 'typeorm';
import { Forum } from '../../forum/entities/forum.entity';
import { BaseFactory } from './base.factory';

export interface ForumFactoryOptions {
  title?: string;
  description?: string;
  courseId?: string;
  isPublic?: boolean;
  courseIds?: string[];
}

/**
 * Enhanced forum factory for test data
 */
export class ForumFactory extends BaseFactory<Forum> {
  private static readonly TITLES = [
    'General Discussion',
    'Course Questions',
    'Study Group',
    'Assignment Help',
    'Technical Support',
    'Resources Sharing',
    'Project Collaboration',
    'Exam Preparation',
    'Career Advice',
    'Feedback Forum',
  ];

  protected getRepository(): Repository<Forum> {
    return this.dataSource.getRepository(Forum);
  }

  /**
   * Generate forum data without persisting
   */
  generate(overrides: ForumFactoryOptions = {}): Forum {
    const title = overrides.title || this.randomPick(ForumFactory.TITLES);
    
    return {
      id: this.randomUUID(),
      title,
      description: this.randomParagraph(2),
      courseId: overrides.courseId || this.randomUUID(),
      isPublic: overrides.isPublic ?? this.randomBoolean(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as Forum;
  }

  /**
   * Create and persist a forum
   */
  async create(overrides: ForumFactoryOptions = {}): Promise<Forum> {
    const forumData = this.generate(overrides);
    return this.save(forumData);
  }

  /**
   * Create multiple forums
   */
  async createMany(count: number, overrides: ForumFactoryOptions = {}): Promise<Forum[]> {
    const forums: Forum[] = [];
    
    for (let i = 0; i < count; i++) {
      const courseId = overrides.courseIds 
        ? this.randomPick(overrides.courseIds)
        : overrides.courseId;
        
      forums.push(await this.create({
        ...overrides,
        courseId,
      }));
    }
    
    return forums;
  }

  /**
   * Create public forum
   */
  async createPublic(overrides: ForumFactoryOptions = {}): Promise<Forum> {
    return this.create({
      ...overrides,
      isPublic: true,
    });
  }

  /**
   * Create private forum
   */
  async createPrivate(overrides: ForumFactoryOptions = {}): Promise<Forum> {
    return this.create({
      ...overrides,
      isPublic: false,
    });
  }
}
