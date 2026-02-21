import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { CourseContent } from './course-content.entity';

@Entity('content_analytics')
@Index(['contentId', 'createdAt'])
@Index(['eventType'])
export class ContentAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  contentId: string;

  @ManyToOne(() => CourseContent, (content) => content.analytics, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentId' })
  content: CourseContent;

  @Column({ nullable: true })
  viewerId: string;

  @Column({ default: 'view' })
  eventType: string;

  @Column({ type: 'float', default: 0 })
  engagementScore: number;

  @Column({ type: 'float', default: 0 })
  completionPercent: number;

  @Column({ default: 0 })
  viewDurationSeconds: number;

  @Column({ default: 0 })
  interactions: number;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
