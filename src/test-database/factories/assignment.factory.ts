import { Repository } from 'typeorm';
import { Assignment } from '../../assignments/entities/assignment.entity';
import { BaseFactory } from './base.factory';

export interface AssignmentFactoryOptions {
  title?: string;
  description?: string;
  courseId?: string;
  instructorId?: string;
  type?: string;
  maxScore?: number;
  dueDate?: Date;
  isPublished?: boolean;
  courseIds?: string[];
  instructorIds?: string[];
}

/**
 * Enhanced assignment factory for test data
 */
export class AssignmentFactory extends BaseFactory<Assignment> {
  private static readonly TITLES = [
    'Programming Exercise',
    'Quiz Chapter 1',
    'Project Submission',
    'Code Review',
    'Problem Set',
    'Lab Assignment',
    'Case Study Analysis',
    'Research Paper',
    'Presentation',
    'Final Exam',
  ];

  private static readonly TYPES = [
    'quiz', 'assignment', 'project', 'exam', 'lab', 'presentation',
  ];

  protected getRepository(): Repository<Assignment> {
    return this.dataSource.getRepository(Assignment);
  }

  /**
   * Generate assignment data without persisting
   */
  generate(overrides: AssignmentFactoryOptions = {}): Assignment {
    const title = overrides.title || this.randomPick(AssignmentFactory.TITLES);
    const type = overrides.type || this.randomPick(AssignmentFactory.TYPES);
    
    return {
      id: this.randomUUID(),
      title,
      description: this.randomParagraph(2),
      type,
      maxScore: overrides.maxScore ?? this.randomNumber(50, 100),
      dueDate: overrides.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      isPublished: overrides.isPublished ?? this.randomBoolean(),
      courseId: overrides.courseId || this.randomUUID(),
      instructorId: overrides.instructorId || this.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as Assignment;
  }

  /**
   * Create and persist an assignment
   */
  async create(overrides: AssignmentFactoryOptions = {}): Promise<Assignment> {
    const assignmentData = this.generate(overrides);
    return this.save(assignmentData);
  }

  /**
   * Create multiple assignments
   */
  async createMany(count: number, overrides: AssignmentFactoryOptions = {}): Promise<Assignment[]> {
    const assignments: Assignment[] = [];
    
    for (let i = 0; i < count; i++) {
      const courseId = overrides.courseIds 
        ? this.randomPick(overrides.courseIds)
        : overrides.courseId;
      const instructorId = overrides.instructorIds 
        ? this.randomPick(overrides.instructorIds)
        : overrides.instructorId;
        
      assignments.push(await this.create({
        ...overrides,
        courseId,
        instructorId,
      }));
    }
    
    return assignments;
  }

  /**
   * Create published assignment
   */
  async createPublished(overrides: AssignmentFactoryOptions = {}): Promise<Assignment> {
    return this.create({
      ...overrides,
      isPublished: true,
    });
  }

  /**
   * Create draft assignment
   */
  async createDraft(overrides: AssignmentFactoryOptions = {}): Promise<Assignment> {
    return this.create({
      ...overrides,
      isPublished: false,
    });
  }

  /**
   * Create quiz
   */
  async createQuiz(overrides: AssignmentFactoryOptions = {}): Promise<Assignment> {
    return this.create({
      ...overrides,
      type: 'quiz',
      maxScore: 100,
    });
  }

  /**
   * Create project
   */
  async createProject(overrides: AssignmentFactoryOptions = {}): Promise<Assignment> {
    return this.create({
      ...overrides,
      type: 'project',
      maxScore: 200,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
    });
  }

  /**
   * Create exam
   */
  async createExam(overrides: AssignmentFactoryOptions = {}): Promise<Assignment> {
    return this.create({
      ...overrides,
      type: 'exam',
      maxScore: 150,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    });
  }

  /**
   * Create overdue assignment
   */
  async createOverdue(overrides: AssignmentFactoryOptions = {}): Promise<Assignment> {
    return this.create({
      ...overrides,
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      isPublished: true,
    });
  }
}
