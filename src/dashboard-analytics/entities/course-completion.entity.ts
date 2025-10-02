import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';

/**
 * Enum for course completion status.
 */
export enum CompletionStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DROPPED = 'dropped',
}

/**
 * Entity representing a user's course completion record.
 */
@Entity('course_completions')
@Unique(['userId', 'courseId'])
@Index(['courseId', 'status'])
@Index(['completedAt'])
export class CourseCompletion {
  /** Unique ID for the course completion record */
  @ApiProperty({ description: 'Unique ID for the course completion record', example: 'uuid-v4' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** User ID */
  @ApiProperty({ description: 'User ID', example: 'uuid-user' })
  @Column({ type: 'uuid' })
  userId: string;

  /** Course ID */
  @ApiProperty({ description: 'Course ID', example: 'uuid-course' })
  @Column({ type: 'uuid' })
  courseId: string;

  /** Completion status */
  @ApiProperty({
    enum: CompletionStatus,
    description: 'Completion status',
    default: CompletionStatus.NOT_STARTED,
  })
  @Column({
    type: 'enum',
    enum: CompletionStatus,
    default: CompletionStatus.NOT_STARTED,
  })
  status: CompletionStatus;

  /** Progress percentage (0-100) */
  @ApiProperty({ description: 'Progress percentage (0-100)', example: 75 })
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progressPercentage: number;

  /** Number of lessons completed */
  @ApiProperty({ description: 'Number of lessons completed', example: 10 })
  @Column({ type: 'integer', default: 0 })
  lessonsCompleted: number;

  /** Total number of lessons */
  @ApiProperty({ description: 'Total number of lessons', example: 12 })
  @Column({ type: 'integer', default: 0 })
  totalLessons: number;

  /** Time spent (minutes) */
  @ApiProperty({ description: 'Time spent (minutes)', example: 120 })
  @Column({ type: 'integer', default: 0 })
  timeSpent: number; // in minutes

  /** Date/time when started (optional) */
  @ApiPropertyOptional({
    description: 'Date/time when started',
    type: String,
    format: 'date-time',
    example: '2025-06-01T10:00:00Z',
  })
  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  /** Date/time when completed (optional) */
  @ApiPropertyOptional({
    description: 'Date/time when completed',
    type: String,
    format: 'date-time',
    example: '2025-06-10T15:00:00Z',
  })
  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  /** Date/time when record was created */
  @ApiProperty({
    description: 'Date/time when record was created',
    type: String,
    format: 'date-time',
    example: '2025-06-01T10:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  /** Date/time when record was last updated */
  @ApiProperty({
    description: 'Date/time when record was last updated',
    type: String,
    format: 'date-time',
    example: '2025-06-10T15:00:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;

  /** User relation */
  @ApiPropertyOptional({ description: 'User relation' })
  @ManyToOne(() => User)
  user: User;

  /** Course relation */
  @ApiPropertyOptional({ description: 'Course relation' })
  @ManyToOne(() => Course)
  course: Course;
}
