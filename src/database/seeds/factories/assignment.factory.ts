import { BaseFactory } from './base.factory';
import { Assignment, AssignmentType } from '../../../assignments/entities/assignment.entity';

export interface AssignmentFactoryOptions {
  title?: string;
  description?: string;
  type?: AssignmentType;
  dueDate?: Date;
  maxPoints?: number;
  allowLateSubmission?: boolean;
  allowResubmission?: boolean;
  enablePeerReview?: boolean;
  fileTypes?: string;
}

/**
 * Factory for generating assignment test data
 */
export class AssignmentFactory extends BaseFactory<Assignment> {
  private static readonly ASSIGNMENT_TITLES = [
    'Introduction to Blockchain',
    'Smart Contract Development',
    'Cryptocurrency Fundamentals',
    'DeFi Protocol Analysis',
    'Web3 Integration Project',
    'Security Audit Exercise',
    'Token Economics Essay',
    'Consensus Mechanisms Study',
    'DApp Development Challenge',
    'Blockchain Use Case Analysis',
  ];

  private static readonly ASSIGNMENT_DESCRIPTIONS = [
    'Complete a comprehensive analysis of blockchain technology and its applications.',
    'Develop a smart contract that implements a specific business logic.',
    'Write an essay discussing the impact of cryptocurrencies on traditional finance.',
    'Analyze a DeFi protocol and identify potential security vulnerabilities.',
    'Build a decentralized application using Web3 technologies.',
    'Conduct a security audit of an existing smart contract.',
    'Design a token economics model for a new blockchain project.',
    'Research and compare different consensus mechanisms.',
    'Create a full-stack decentralized application.',
    'Identify and analyze real-world blockchain use cases.',
  ];

  protected getRepository() {
    return this.dataSource.getRepository(Assignment);
  }

  async create(overrides: AssignmentFactoryOptions = {}): Promise<Assignment> {
    const assignmentData = this.generate(overrides);
    return await this.save(assignmentData);
  }

  generate(overrides: AssignmentFactoryOptions = {}): Assignment {
    const type = overrides.type || this.randomPick(Object.values(AssignmentType));
    const title = overrides.title || this.randomPick(AssignmentFactory.ASSIGNMENT_TITLES);
    const description = overrides.description || this.randomPick(AssignmentFactory.ASSIGNMENT_DESCRIPTIONS);
    const dueDate = overrides.dueDate || this.randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    return {
      id: this.randomUUID(),
      title,
      description,
      type,
      fileTypes: overrides.fileTypes || 'pdf,doc,docx,txt',
      dueDate,
      lateDueDate: this.randomBoolean() ? this.randomDate(dueDate, new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)) : undefined,
      latePenalty: this.randomNumber(5, 20),
      maxPoints: overrides.maxPoints || this.randomNumber(50, 200),
      allowLateSubmission: overrides.allowLateSubmission !== undefined ? overrides.allowLateSubmission : this.randomBoolean(),
      allowResubmission: overrides.allowResubmission !== undefined ? overrides.allowResubmission : false,
      enablePeerReview: overrides.enablePeerReview !== undefined ? overrides.enablePeerReview : this.randomBoolean(),
      rubrics: [],
      submissions: [],
      createdAt: this.randomDate(),
      updatedAt: new Date(),
    } as Assignment;
  }

  /**
   * Create quiz assignment
   */
  async createQuiz(overrides: AssignmentFactoryOptions = {}): Promise<Assignment> {
    return await this.create({
      ...overrides,
      type: AssignmentType.QUIZ,
      maxPoints: 100,
    });
  }

  /**
   * Create project assignment
   */
  async createProject(overrides: AssignmentFactoryOptions = {}): Promise<Assignment> {
    return await this.create({
      ...overrides,
      type: AssignmentType.PROJECT,
      maxPoints: 200,
    });
  }

  /**
   * Create essay assignment
   */
  async createEssay(overrides: AssignmentFactoryOptions = {}): Promise<Assignment> {
    return await this.create({
      ...overrides,
      type: AssignmentType.ESSAY,
      maxPoints: 150,
    });
  }

  /**
   * Create code assignment
   */
  async createCode(overrides: AssignmentFactoryOptions = {}): Promise<Assignment> {
    return await this.create({
      ...overrides,
      type: AssignmentType.CODE,
      maxPoints: 180,
    });
  }
}
