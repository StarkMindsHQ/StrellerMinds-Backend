import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne } from 'typeorm';
import { Submission } from './submission.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('grades')
export class Grade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Submission, submission => submission.grade)
  submission: Submission;

  @Column('decimal', { precision: 5, scale: 2 })
  score: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  originalScore?: number; // Before late penalty

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  latePenaltyApplied?: number;

  @Column('text', { nullable: true })
  feedback: string;

  @Column('simple-json', { nullable: true })
  rubricScores: Array<{
    rubricId: string;
    criteria: string;
    score: number;
    maxPoints: number;
  }>;

  @ManyToOne(() => User)
  gradedBy: User;

  @Column({ type: 'timestamp', nullable: true })
  gradedAt: Date;

  @Column({ default: false })
  isFinal: boolean;
}