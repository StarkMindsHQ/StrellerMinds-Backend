import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { LearningPathNode } from './learning-path-node.entity';
import { LearningPathEnrollment } from './learning-path-enrollment.entity';
import { LearningPathTemplate } from './learning-path-template.entity';

export enum LearningPathStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum LearningPathType {
  LINEAR = 'linear',
  ADAPTIVE = 'adaptive',
  CUSTOM = 'custom',
}

@Entity('learning_paths')
@Index(['status', 'createdAt'])
@Index(['instructorId'])
@Index(['templateId'])
export class LearningPath {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: LearningPathType, default: LearningPathType.LINEAR })
  type: LearningPathType;

  @Column({ type: 'enum', enum: LearningPathStatus, default: LearningPathStatus.DRAFT })
  @Index()
  status: LearningPathStatus;

  @Column({ type: 'uuid' })
  instructorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instructorId' })
  instructor: User;

  @Column({ type: 'uuid', nullable: true })
  templateId: string;

  @ManyToOne(() => LearningPathTemplate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'templateId' })
  template: LearningPathTemplate;

  @Column({ type: 'simple-json', default: {} })
  metadata: Record<string, any>;

  @Column({ default: 0 })
  estimatedDurationHours: number;

  @Column({ default: 0 })
  totalNodes: number;

  @OneToMany(() => LearningPathNode, (node) => node.learningPath, {
    cascade: true,
  })
  nodes: LearningPathNode[];

  @OneToMany(() => LearningPathEnrollment, (enrollment) => enrollment.learningPath)
  enrollments: LearningPathEnrollment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
