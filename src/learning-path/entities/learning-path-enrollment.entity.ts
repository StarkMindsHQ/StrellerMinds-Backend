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
import { User } from '../../auth/entities/user.entity';
import { LearningPath } from './learning-path.entity';
import { NodeProgress } from './node-progress.entity';

export enum EnrollmentStatus {
  ENROLLED = 'enrolled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DROPPED = 'dropped',
  PAUSED = 'paused',
}

@Entity('learning_path_enrollments')
@Index(['userId', 'learningPathId'])
@Index(['status'])
export class LearningPathEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  learningPathId: string;

  @ManyToOne(() => LearningPath, path => path.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'learningPathId' })
  learningPath: LearningPath;

  @Column({ type: 'enum', enum: EnrollmentStatus, default: EnrollmentStatus.ENROLLED })
  @Index()
  status: EnrollmentStatus;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  completionDate: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  overallProgress: number; // Percentage completion

  @Column({ type: 'simple-json', default: {} })
  preferences: Record<string, any>; // Learning preferences, pace, etc.

  @Column({ type: 'simple-json', default: {} })
  metadata: Record<string, any>; // Additional tracking data

  @OneToMany(() => NodeProgress, progress => progress.enrollment)
  nodeProgress: NodeProgress[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}