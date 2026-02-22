import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum EngagementEventType {
  PAGE_VIEW = 'page_view',
  VIDEO_PLAY = 'video_play',
  VIDEO_PAUSE = 'video_pause',
  VIDEO_COMPLETE = 'video_complete',
  QUIZ_START = 'quiz_start',
  QUIZ_SUBMIT = 'quiz_submit',
  LESSON_START = 'lesson_start',
  LESSON_COMPLETE = 'lesson_complete',
  RESOURCE_DOWNLOAD = 'resource_download',
  FORUM_POST = 'forum_post',
  COMMENT = 'comment',
  LOGIN = 'login',
  LOGOUT = 'logout',
}

@Entity('engagement_events')
@Index(['userId', 'createdAt'])
@Index(['courseId', 'createdAt'])
@Index(['eventType', 'createdAt'])
export class EngagementEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  courseId: string;

  @Column({ type: 'uuid', nullable: true })
  lessonId: string;

  @Column({ type: 'uuid', nullable: true })
  moduleId: string;

  @Column({ type: 'enum', enum: EngagementEventType })
  eventType: EngagementEventType;

  @Column({ type: 'int', default: 0 })
  durationSeconds: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'varchar', length: 50, nullable: true })
  deviceType: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  sessionId: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
