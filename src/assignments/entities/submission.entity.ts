import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Assignment, AssignmentType, SubmissionStatus } from './assignment.entity';
import { User } from '../../auth/entities/user.entity';
import { Grade } from './grade.entity';
import { Annotation } from './annotation.entity';
import { PeerReview } from './peer-review.entity';

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Assignment, (assignment) => assignment.submissions)
  assignment: Assignment;

  @ManyToOne(() => User)
  student: User;

  @Column({ type: 'enum', enum: AssignmentType })
  submissionType: AssignmentType;

  @Column({ nullable: true })
  textContent?: string;

  @Column({ nullable: true })
  fileUrl?: string;

  @Column({ nullable: true })
  fileName?: string;

  @Column({ nullable: true })
  codeContent?: string;

  @Column({ nullable: true })
  programmingLanguage?: string;

  @Column({ type: 'enum', enum: SubmissionStatus, default: SubmissionStatus.DRAFT })
  status: SubmissionStatus;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ default: 0 })
  version: number;

  @Column({ nullable: true })
  previousVersionId?: string;

  @Column({ default: false })
  isLate: boolean;

  @Column({ nullable: true })
  plagiarismScore?: number;

  @Column({ nullable: true })
  plagiarismReportUrl?: string;

  @OneToOne(() => Grade, (grade) => grade.submission)
  @JoinColumn()
  grade: Grade;

  @OneToMany(() => Annotation, (annotation) => annotation.submission)
  annotations: Annotation[];

  @OneToMany(() => PeerReview, (review) => review.submission)
  peerReviews: PeerReview[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
