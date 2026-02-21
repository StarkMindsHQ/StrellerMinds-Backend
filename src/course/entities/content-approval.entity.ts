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
import { ContentStatus } from '../enums/content-status.enum';
import { ApprovalDecision } from '../enums/approval-decision.enum';

@Entity('content_approvals')
@Index(['contentId', 'requestedAt'])
export class ContentApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  contentId: string;

  @ManyToOne(() => CourseContent, (content) => content.approvals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentId' })
  content: CourseContent;

  @Column({ type: 'enum', enum: ContentStatus, default: ContentStatus.IN_REVIEW })
  status: ContentStatus;

  @Column({ type: 'enum', enum: ApprovalDecision, nullable: true })
  decision: ApprovalDecision;

  @Column({ nullable: true })
  reviewerId: string;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @CreateDateColumn()
  requestedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  decidedAt: Date;
}
