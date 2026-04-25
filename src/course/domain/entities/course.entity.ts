import { DomainEntity } from '../../../shared/domain/entities/domain-entity.base';

export interface CoursePrimitives {
  id: string;
  title: string;
  description: string | null;
  category?: string;
  difficulty?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Course Domain Entity
 * Represents a course in the domain layer
 * Contains business logic related to courses
 */
export class Course extends DomainEntity<CoursePrimitives> {
  private readonly title: string;
  private readonly description: string | null;
  private readonly category?: string;
  private readonly difficulty?: string;
  private readonly isActive: boolean;

  constructor(
    id: string,
    title: string,
    description: string | null,
    isActive: boolean,
    createdAt: Date,
    updatedAt: Date,
    category?: string,
    difficulty?: string,
  ) {
    super(id, createdAt, updatedAt);
    this.title = title;
    this.description = description;
    this.isActive = isActive;
    this.category = category;
    this.difficulty = difficulty;
  }

  getTitle(): string {
    return this.title;
  }

  getDescription(): string | null {
    return this.description;
  }

  getCategory(): string | undefined {
    return this.category;
  }

  getDifficulty(): string | undefined {
    return this.difficulty;
  }

  isActiveCourse(): boolean {
    return this.isActive;
  }

  /**
   * Create a new Course from primitives
   */
  static create(primitives: CoursePrimitives): Course {
    return new Course(
      primitives.id,
      primitives.title,
      primitives.description,
      primitives.isActive,
      primitives.createdAt,
      primitives.updatedAt,
      primitives.category,
      primitives.difficulty,
    );
  }

  toPrimitives(): CoursePrimitives {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      category: this.category,
      difficulty: this.difficulty,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
