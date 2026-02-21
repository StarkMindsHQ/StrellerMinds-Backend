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

@Entity('content_versions')
@Index(['contentId', 'version'], { unique: true })
export class ContentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  contentId: string;

  @ManyToOne(() => CourseContent, (content) => content.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentId' })
  content: CourseContent;

  @Column()
  version: number;

  @Column({ type: 'json' })
  snapshot: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  changeSummary: string;

  @Column({ nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;
}
