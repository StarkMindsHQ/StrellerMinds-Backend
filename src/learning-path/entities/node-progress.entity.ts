import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { LearningPathEnrollment } from './learning-path-enrollment.entity';
import { LearningPathNode } from './learning-path-node.entity';

export enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

@Entity('node_progress')
@Index(['enrollmentId', 'nodeId'])
@Index(['status'])
export class NodeProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  enrollmentId: string;

  @ManyToOne(() => LearningPathEnrollment, enrollment => enrollment.nodeProgress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: LearningPathEnrollment;

  @Column({ type: 'uuid' })
  nodeId: string;

  @ManyToOne(() => LearningPathNode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nodeId' })
  node: LearningPathNode;

  @Column({ type: 'enum', enum: ProgressStatus, default: ProgressStatus.NOT_STARTED })
  @Index()
  status: ProgressStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionPercentage: number;

  @Column({ type: 'int', default: 0 })
  timeSpentMinutes: number;

  @Column({ type: 'int', nullable: true })
  score: number; // For assessments

  @Column({ type: 'int', nullable: true })
  attempts: number;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'simple-json', default: {} })
  assessmentData: Record<string, any>; // Detailed assessment results

  @Column({ type: 'simple-json', default: {} })
  metadata: Record<string, any>; // Additional tracking data

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}