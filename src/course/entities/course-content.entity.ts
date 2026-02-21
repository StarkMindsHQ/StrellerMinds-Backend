import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Lesson } from './lesson.entity';
import { ContentFormat } from '../enums/content-format.enum';
import { ContentStatus } from '../enums/content-status.enum';
import { ContentTemplate } from './content-template.entity';
import { ContentVersion } from './content-version.entity';
import { ContentCollaboration } from './content-collaboration.entity';
import { ContentApproval } from './content-approval.entity';
import { ContentAnalytics } from './content-analytics.entity';

@Entity('course_contents')
@Index(['lessonId', 'format'])
@Index(['status', 'updatedAt'])
export class CourseContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  lessonId: string;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @Column()
  title: string;

  @Column({ type: 'enum', enum: ContentFormat })
  format: ContentFormat;

  @Column({ type: 'json', nullable: true })
  body: Record<string, any>;

  @Column({ nullable: true })
  videoUrl: string;

  @Column({ type: 'json', nullable: true })
  interactiveConfig: Record<string, any>;

  @Column({ default: false })
  reusable: boolean;

  @Column({ type: 'uuid', nullable: true })
  templateId: string;

  @ManyToOne(() => ContentTemplate, (template) => template.contents, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'templateId' })
  template: ContentTemplate;

  @Column({ type: 'enum', enum: ContentStatus, default: ContentStatus.DRAFT })
  status: ContentStatus;

  @Column({ default: 1 })
  currentVersion: number;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  updatedBy: string;

  @OneToMany(() => ContentVersion, (version) => version.content)
  versions: ContentVersion[];

  @OneToMany(() => ContentCollaboration, (collab) => collab.content)
  collaborators: ContentCollaboration[];

  @OneToMany(() => ContentApproval, (approval) => approval.content)
  approvals: ContentApproval[];

  @OneToMany(() => ContentAnalytics, (analytics) => analytics.content)
  analytics: ContentAnalytics[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
