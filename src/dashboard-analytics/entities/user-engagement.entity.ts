import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';

/**
 * Enum for user engagement event types.
 */
export enum EngagementType {
  LOGIN = 'login',
  COURSE_VIEW = 'course_view',
  LESSON_START = 'lesson_start',
  LESSON_COMPLETE = 'lesson_complete',
  QUIZ_ATTEMPT = 'quiz_attempt',
  FORUM_POST = 'forum_post',
  DOWNLOAD = 'download',
}

/**
 * Entity representing a user engagement event.
 */
@Entity('user_engagements')
@Index(['userId', 'createdAt'])
@Index(['courseId', 'createdAt'])
@Index(['engagementType', 'createdAt'])
export class UserEngagement {
  /** Unique ID for the engagement event */
  @ApiProperty({ description: 'Unique ID for the engagement event', example: 'uuid-v4' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** User ID */
  @ApiProperty({ description: 'User ID', example: 'uuid-user' })
  @Column({ type: 'uuid' })
  userId: string;

  /** Course ID (optional) */
  @ApiPropertyOptional({ description: 'Course ID (optional)', example: 'uuid-course' })
  @Column({ type: 'uuid', nullable: true })
  courseId?: string;

  /** Engagement type */
  @ApiProperty({ enum: EngagementType, description: 'Engagement type' })
  @Column({
    type: 'enum',
    enum: EngagementType,
  })
  engagementType: EngagementType;

  /** Additional metadata (optional) */
  @ApiPropertyOptional({
    description: 'Additional metadata',
    type: 'object',
    example: { lessonId: 'uuid-lesson' },
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  /** Duration in seconds */
  @ApiProperty({ description: 'Duration in seconds', example: 60 })
  @Column({ type: 'integer', default: 1 })
  duration: number; // in seconds

  /** Date/time when event was created */
  @ApiProperty({
    description: 'Date/time when event was created',
    type: String,
    format: 'date-time',
    example: '2025-06-01T10:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  /** User relation */
  @ApiPropertyOptional({ description: 'User relation' })
  @ManyToOne(() => User)
  user: User;

  /** Course relation (optional) */
  @ApiPropertyOptional({ description: 'Course relation (optional)' })
  @ManyToOne(() => Course, { nullable: true })
  course?: Course;
}
