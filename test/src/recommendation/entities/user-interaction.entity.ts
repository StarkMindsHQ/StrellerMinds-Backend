import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';

export enum InteractionType {
  VIEW = 'view',
  CLICK = 'click',
  ENROLL = 'enroll',
  COMPLETE = 'complete',
  RATE = 'rate',
  BOOKMARK = 'bookmark',
  SHARE = 'share',
  SEARCH = 'search',
  FILTER = 'filter',
  DOWNLOAD = 'download',
  PAUSE = 'pause',
  RESUME = 'resume',
  SKIP = 'skip',
  REPEAT = 'repeat',
}

export enum InteractionContext {
  HOMEPAGE = 'homepage',
  SEARCH_RESULTS = 'search_results',
  COURSE_PAGE = 'course_page',
  RECOMMENDATION = 'recommendation',
  LEARNING_PATH = 'learning_path',
  PROFILE = 'profile',
  DASHBOARD = 'dashboard',
  CATEGORY_PAGE = 'category_page',
  NOTIFICATION = 'notification',
}

@Entity('user_interactions')
@Index(['userId', 'interactionType', 'createdAt'])
@Index(['courseId', 'interactionType'])
@Index(['sessionId'])
@Index(['createdAt'])
export class UserInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid', { nullable: true })
  courseId?: string;

  @ManyToOne(() => Course, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @Column('uuid', { nullable: true })
  recommendationId?: string;

  @Column({
    type: 'enum',
    enum: InteractionType,
  })
  interactionType: InteractionType;

  @Column({
    type: 'enum',
    enum: InteractionContext,
    nullable: true,
  })
  context?: InteractionContext;

  @Column('varchar', { length: 255, nullable: true })
  sessionId?: string;

  @Column('decimal', { precision: 5, scale: 4, nullable: true })
  value?: number; // For ratings, progress, etc.

  @Column('int', { nullable: true })
  duration?: number; // Duration in seconds

  @Column('jsonb', { nullable: true })
  metadata?: {
    deviceType?: string;
    browserType?: string;
    referrer?: string;
    searchQuery?: string;
    filters?: Record<string, any>;
    position?: number; // Position in list/grid
    pageNumber?: number;
    scrollDepth?: number;
    timeOnPage?: number;
    clickCoordinates?: { x: number; y: number };
    videoProgress?: number;
    quizScore?: number;
    tags?: string[];
  };

  @Column('inet', { nullable: true })
  ipAddress?: string;

  @Column('varchar', { length: 500, nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  createdAt: Date;

  // Virtual properties
  get isPositiveInteraction(): boolean {
    return [
      InteractionType.ENROLL,
      InteractionType.COMPLETE,
      InteractionType.BOOKMARK,
      InteractionType.SHARE,
      InteractionType.RATE,
    ].includes(this.interactionType);
  }

  get isEngagementInteraction(): boolean {
    return [
      InteractionType.VIEW,
      InteractionType.CLICK,
      InteractionType.DOWNLOAD,
      InteractionType.REPEAT,
    ].includes(this.interactionType);
  }

  get weightedValue(): number {
    const weights = {
      [InteractionType.VIEW]: 1,
      [InteractionType.CLICK]: 2,
      [InteractionType.ENROLL]: 5,
      [InteractionType.COMPLETE]: 10,
      [InteractionType.RATE]: 3,
      [InteractionType.BOOKMARK]: 4,
      [InteractionType.SHARE]: 6,
      [InteractionType.SEARCH]: 1,
      [InteractionType.FILTER]: 1,
      [InteractionType.DOWNLOAD]: 3,
      [InteractionType.PAUSE]: -1,
      [InteractionType.RESUME]: 2,
      [InteractionType.SKIP]: -2,
      [InteractionType.REPEAT]: 4,
    };

    let weight = weights[this.interactionType] || 1;
    
    // Apply value multiplier for ratings
    if (this.interactionType === InteractionType.RATE && this.value) {
      weight *= this.value;
    }

    return weight;
  }
}
