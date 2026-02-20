import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Submission } from './submission.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('peer_reviews')
export class PeerReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Submission, (submission) => submission.peerReviews)
  submission: Submission;

  @ManyToOne(() => User)
  reviewer: User;

  @Column('simple-json')
  rubricScores: Array<{
    rubricId: string;
    criteria: string;
    score: number;
    feedback: string;
  }>;

  @Column('text', { nullable: true })
  overallFeedback: string;

  @Column('decimal', { precision: 5, scale: 2 })
  overallScore: number;

  @Column({ default: false })
  isAnonymous: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
