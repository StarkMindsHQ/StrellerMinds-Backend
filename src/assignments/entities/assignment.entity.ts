import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Submission } from './submission.entity';
import { Rubric } from './rubric.entity';

export enum AssignmentType {
  FILE = 'file',
  TEXT = 'text',
  CODE = 'code',
  MIXED = 'mixed'
}

export enum SubmissionStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  LATE = 'late',
  GRADED = 'graded'
}

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ type: 'enum', enum: AssignmentType, default: AssignmentType.MIXED })
  type: AssignmentType;

  @Column({ nullable: true })
  fileTypes?: string; // Comma-separated allowed extensions

  @Column({ type: 'timestamp' })
  dueDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  lateDueDate?: Date;

  @Column({ default: 0 })
  latePenalty: number; // Percentage penalty per day

  @Column({ default: 100 })
  maxPoints: number;

  @Column({ default: true })
  allowLateSubmission: boolean;

  @Column({ default: false })
  allowResubmission: boolean;

  @Column({ default: false })
  enablePeerReview: boolean;

  @OneToMany(() => Rubric, rubric => rubric.assignment)
  rubrics: Rubric[];

  @OneToMany(() => Submission, submission => submission.assignment)
  submissions: Submission[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}