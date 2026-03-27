import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  ManyToOne,
  JoinTable,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  Check,
} from 'typeorm';
import { AggregateRoot } from '../../common/domain/aggregate-root.base';
import { Money } from '../../common/domain/value-objects/money.value-object';
import { CourseStatus } from '../enums/course-status.enum';
import { CourseModule } from './module.entity';
import { CourseVersion } from './course-version.entity';
import { Category } from './category.entity';
import { Tag } from './tag.entity';
import { User } from '../../auth/entities/user.entity';
import { 
  CourseCreatedEvent, 
  CoursePublishedEvent 
} from '../../common/domain/events/course.domain-events';

export { CourseStatus };

@Entity('courses')
@Index(['status', 'createdAt'])
@Index(['instructorId'])
@Index(['publishedAt'])
@Check(`"durationMinutes" >= 0`)
export class Course extends AggregateRoot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  subtitle: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  level: string;

  @Column()
  language: string;

  @Column({ default: 0 })
  durationMinutes: number;

  @Column({ type: 'enum', enum: CourseStatus, default: CourseStatus.DRAFT })
  @Index()
  private _status: CourseStatus;

  @Column({ type: 'uuid', nullable: true })
  instructorId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'instructorId' })
  instructor: User;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  private _price: number;

  @Column({ default: 'USD' })
  private _currency: string;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @OneToMany('CourseModule', 'course', {
    cascade: true,
  })
  modules: CourseModule[];

  @OneToMany('CourseVersion', 'course')
  versions: CourseVersion[];

  @ManyToMany(() => Category)
  @JoinTable({
    name: 'course_categories',
    joinColumn: { name: 'courseId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
  })
  categories: Category[];

  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'course_tags',
    joinColumn: { name: 'courseId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags: Tag[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // Static factory method for creating new courses
  static create(
    title: string,
    description: string,
    level: string,
    language: string,
    instructorId: string,
    price: number = 0,
    currency: string = 'USD'
  ): Course {
    const course = new Course();
    
    course.title = title;
    course.description = description;
    course.level = level;
    course.language = language;
    course.instructorId = instructorId;
    course._price = price;
    course._currency = currency;
    course._status = CourseStatus.DRAFT;
    course.durationMinutes = 0;

    // Add domain event
    course.addDomainEvent(new CourseCreatedEvent(
      course.id,
      course.title,
      course.instructorId,
      course._price,
      course._currency
    ));

    return course;
  }

  // Getters for private fields
  get status(): CourseStatus {
    return this._status;
  }

  get price(): Money {
    return Money.create(this._price, this._currency);
  }

  // Business logic methods
  publish(): void {
    if (this._status !== CourseStatus.DRAFT) {
      throw new Error('Only draft courses can be published');
    }

    if (!this.title || !this.description) {
      throw new Error('Course must have title and description to be published');
    }

    if (this.durationMinutes <= 0) {
      throw new Error('Course must have duration to be published');
    }

    this._status = CourseStatus.PUBLISHED;
    this.publishedAt = new Date();

    this.addDomainEvent(new CoursePublishedEvent(this.id, this.publishedAt));
  }

  unpublish(): void {
    if (this._status !== CourseStatus.PUBLISHED) {
      throw new Error('Only published courses can be unpublished');
    }

    this._status = CourseStatus.DRAFT;
    this.publishedAt = null;
  }

  archive(): void {
    if (this._status === CourseStatus.ARCHIVED) {
      throw new Error('Course is already archived');
    }

    this._status = CourseStatus.ARCHIVED;
  }

  updatePrice(newPrice: number, newCurrency?: string): void {
    if (this._status === CourseStatus.PUBLISHED) {
      throw new Error('Cannot change price of published course');
    }

    const money = Money.create(newPrice, newCurrency || this._currency);
    this._price = money.getAmount();
    this._currency = money.getCurrency();
  }

  addDuration(minutes: number): void {
    if (minutes <= 0) {
      throw new Error('Duration must be positive');
    }

    this.durationMinutes += minutes;
  }

  isPublished(): boolean {
    return this._status === CourseStatus.PUBLISHED;
  }

  isDraft(): boolean {
    return this._status === CourseStatus.DRAFT;
  }

  isArchived(): boolean {
    return this._status === CourseStatus.ARCHIVED;
  }

  canBeEnrolled(): boolean {
    return this._status === CourseStatus.PUBLISHED;
  }

  updateBasicInfo(title: string, description: string, subtitle?: string): void {
    if (this._status === CourseStatus.PUBLISHED) {
      throw new Error('Cannot update basic info of published course');
    }

    this.title = title;
    this.description = description;
    if (subtitle !== undefined) {
      this.subtitle = subtitle;
    }
  }

  getEstimatedCompletionTime(): number {
    // Base duration plus additional time for assessments
    const assessmentTime = Math.ceil(this.durationMinutes * 0.2); // 20% extra for assessments
    return this.durationMinutes + assessmentTime;
  }

  isFree(): boolean {
    return this._price === 0;
  }

  getFormattedPrice(): string {
    return this.price.toString();
  }
}
