import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  Check,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OptimizedUser } from './optimized-user.entity';
import { CourseModule } from '../../courses/entities/course-module.entity';
import { CourseReview } from '../../courses/entities/course-review.entity';
import { Category } from '../../catogory/entities/category.entity';
import { Certificate } from '../../certificate/entity/certificate.entity';
import { UserProgress } from '../../users/entities/user-progress.entity';
import { CourseStatus } from '../../courses/enums/course-status.enum';
import { DifficultyLevel } from '../../courses/enums/difficulty-level.enum';

/**
 * Optimized Course entity with proper constraints, indexes, and relationships
 */
@Entity('courses')
@Index('IDX_courses_title', ['title'])
@Index('IDX_courses_instructor', ['instructorId'])
@Index('IDX_courses_category', ['categoryId'])
@Index('IDX_courses_status', ['status'])
@Index('IDX_courses_difficulty', ['difficulty'])
@Index('IDX_courses_published_at', ['publishedAt'])
@Index('IDX_courses_created_at', ['createdAt'])
@Index('IDX_courses_rating', ['averageRating'])
@Index('IDX_courses_price', ['price'])
@Index('IDX_courses_featured', ['isFeatured'])
@Index('IDX_courses_search', ['title', 'description'])
@Index('IDX_courses_instructor_status', ['instructorId', 'status'])
@Check('CHK_courses_title_length', 'LENGTH(title) >= 3')
@Check('CHK_courses_price_positive', 'price >= 0')
@Check('CHK_courses_rating_range', 'averageRating >= 0 AND averageRating <= 5')
@Check('CHK_courses_duration_positive', 'estimatedDuration > 0')
export class OptimizedCourse {
  @ApiProperty({
    description: 'Unique course ID',
    example: 'uuid-v4',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Course title',
    example: 'Introduction to Blockchain',
    minLength: 3,
    maxLength: 200,
  })
  @Column({
    type: 'varchar',
    length: 200,
    nullable: false,
    comment: 'Course title - must be at least 3 characters',
  })
  title: string;

  @ApiProperty({
    description: 'Course description',
    example: 'Learn the fundamentals of blockchain technology',
    maxLength: 2000,
  })
  @Column({
    type: 'text',
    nullable: false,
    comment: 'Detailed course description',
  })
  description: string;

  @ApiPropertyOptional({
    description: 'Course thumbnail URL',
    example: 'https://cdn.com/course-thumb.jpg',
    maxLength: 500,
  })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'URL to course thumbnail image',
  })
  thumbnailUrl: string;

  @ApiProperty({
    description: 'Course price in USD',
    example: 99.99,
    minimum: 0,
  })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    nullable: false,
    comment: 'Course price in USD - 0 for free courses',
  })
  price: number;

  @ApiProperty({
    description: 'Course status',
    enum: CourseStatus,
    example: CourseStatus.PUBLISHED,
  })
  @Column({
    type: 'enum',
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
    nullable: false,
    comment: 'Current course status',
  })
  status: CourseStatus;

  @ApiProperty({
    description: 'Course difficulty level',
    enum: DifficultyLevel,
    example: DifficultyLevel.BEGINNER,
  })
  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    default: DifficultyLevel.BEGINNER,
    nullable: false,
    comment: 'Course difficulty level',
  })
  difficulty: DifficultyLevel;

  @ApiProperty({
    description: 'Estimated duration in minutes',
    example: 480,
    minimum: 1,
  })
  @Column({
    type: 'integer',
    nullable: false,
    comment: 'Estimated course duration in minutes',
  })
  estimatedDuration: number;

  @ApiProperty({
    description: 'Average course rating',
    example: 4.5,
    minimum: 0,
    maximum: 5,
  })
  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
    nullable: false,
    comment: 'Average rating from 0 to 5',
  })
  averageRating: number;

  @ApiProperty({
    description: 'Total number of ratings',
    example: 150,
    minimum: 0,
  })
  @Column({
    type: 'integer',
    default: 0,
    nullable: false,
    comment: 'Total number of ratings received',
  })
  totalRatings: number;

  @ApiProperty({
    description: 'Number of enrolled students',
    example: 1250,
    minimum: 0,
  })
  @Column({
    type: 'integer',
    default: 0,
    nullable: false,
    comment: 'Total number of enrolled students',
  })
  enrollmentCount: number;

  @ApiProperty({
    description: 'Is course featured',
    example: false,
  })
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    comment: 'Whether course is featured on homepage',
  })
  isFeatured: boolean;

  @ApiPropertyOptional({
    description: 'Course language',
    example: 'en',
    maxLength: 10,
  })
  @Column({
    type: 'varchar',
    length: 10,
    default: 'en',
    nullable: false,
    comment: 'Course language code',
  })
  language: string;

  @ApiPropertyOptional({
    description: 'Course tags for search',
    example: ['blockchain', 'cryptocurrency', 'web3'],
  })
  @Column({
    type: 'text',
    array: true,
    nullable: true,
    comment: 'Array of tags for search and categorization',
  })
  tags: string[];

  @ApiPropertyOptional({
    description: 'Course learning objectives',
    example: ['Understand blockchain basics', 'Create smart contracts'],
  })
  @Column({
    type: 'text',
    array: true,
    nullable: true,
    comment: 'Array of learning objectives',
  })
  learningObjectives: string[];

  @ApiPropertyOptional({
    description: 'Course prerequisites',
    example: ['Basic programming knowledge', 'Understanding of cryptography'],
  })
  @Column({
    type: 'text',
    array: true,
    nullable: true,
    comment: 'Array of course prerequisites',
  })
  prerequisites: string[];

  // Foreign key columns with proper constraints
  @ApiProperty({
    description: 'Instructor ID',
    example: 'uuid-v4',
    format: 'uuid',
  })
  @Column({
    type: 'uuid',
    nullable: false,
    comment: 'ID of the course instructor',
  })
  @Index('IDX_courses_instructor_id')
  instructorId: string;

  @ApiPropertyOptional({
    description: 'Category ID',
    example: 'uuid-v4',
    format: 'uuid',
  })
  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'ID of the course category',
  })
  @Index('IDX_courses_category_id')
  categoryId: string;

  // Audit fields
  @ApiPropertyOptional({
    description: 'Date published',
    example: '2024-01-01T00:00:00Z',
  })
  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When the course was published',
  })
  publishedAt: Date;

  @ApiProperty({
    description: 'Date created',
    example: '2024-01-01T00:00:00Z',
  })
  @CreateDateColumn({
    type: 'timestamptz',
    comment: 'When the course was created',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date updated',
    example: '2024-01-01T00:00:00Z',
  })
  @UpdateDateColumn({
    type: 'timestamptz',
    comment: 'When the course was last updated',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Date deleted',
    example: '2024-01-01T00:00:00Z',
  })
  @DeleteDateColumn({
    type: 'timestamptz',
    nullable: true,
    comment: 'When the course was soft deleted',
  })
  deletedAt: Date;

  // Relationships with proper foreign key constraints
  @ManyToOne(() => OptimizedUser, (user) => user.instructorCourses, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({
    name: 'instructorId',
    referencedColumnName: 'id',
  })
  instructor: OptimizedUser;

  @ManyToOne(() => Category, (category) => category.courses, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({
    name: 'categoryId',
    referencedColumnName: 'id',
  })
  category: Category;

  @OneToMany(() => CourseModule, (module) => module.course, {
    cascade: ['insert', 'update', 'remove'],
    onDelete: 'CASCADE',
  })
  modules: CourseModule[];

  @OneToMany(() => CourseReview, (review) => review.course, {
    cascade: ['remove'],
    onDelete: 'CASCADE',
  })
  reviews: CourseReview[];

  @OneToMany(() => Certificate, (certificate) => certificate.course, {
    cascade: ['remove'],
    onDelete: 'CASCADE',
  })
  certificates: Certificate[];

  @OneToMany(() => UserProgress, (progress) => progress.course, {
    cascade: ['remove'],
    onDelete: 'CASCADE',
  })
  userProgress: UserProgress[];

  @ManyToMany(() => OptimizedUser, {
    cascade: false,
    onDelete: 'CASCADE',
  })
  @JoinTable({
    name: 'course_enrollments',
    joinColumn: {
      name: 'courseId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'userId',
      referencedColumnName: 'id',
    },
  })
  enrolledStudents: OptimizedUser[];

  // Business logic methods
  @BeforeInsert()
  @BeforeUpdate()
  validateCourse() {
    if (this.status === CourseStatus.PUBLISHED && !this.publishedAt) {
      this.publishedAt = new Date();
    }

    if (this.price < 0) {
      throw new Error('Course price cannot be negative');
    }

    if (this.averageRating < 0 || this.averageRating > 5) {
      throw new Error('Average rating must be between 0 and 5');
    }
  }

  isPublished(): boolean {
    return this.status === CourseStatus.PUBLISHED && !this.deletedAt;
  }

  isFree(): boolean {
    return this.price === 0;
  }

  canEnroll(): boolean {
    return this.isPublished() && this.status !== CourseStatus.ARCHIVED;
  }

  updateRating(newRating: number): void {
    const totalScore = this.averageRating * this.totalRatings + newRating;
    this.totalRatings += 1;
    this.averageRating = Number((totalScore / this.totalRatings).toFixed(2));
  }

  incrementEnrollment(): void {
    this.enrollmentCount += 1;
  }

  // Computed properties
  get isPopular(): boolean {
    return this.enrollmentCount > 100 && this.averageRating >= 4.0;
  }

  get formattedPrice(): string {
    return this.isFree() ? 'Free' : `$${this.price.toFixed(2)}`;
  }

  get formattedDuration(): string {
    const hours = Math.floor(this.estimatedDuration / 60);
    const minutes = this.estimatedDuration % 60;

    if (hours === 0) {
      return `${minutes}m`;
    }

    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  }
}
