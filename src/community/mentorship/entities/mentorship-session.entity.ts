import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Mentorship } from './mentorship.entity';

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

@Entity('mentorship_sessions')
export class MentorshipSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mentorship_id' })
  mentorshipId: string;

  @ManyToOne(() => Mentorship, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentorship_id' })
  mentorship: Mentorship;

  @Column({ type: 'timestamp' })
  scheduledAt: Date;

  @Column({ type: 'int' })
  durationMinutes: number;

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.SCHEDULED })
  status: SessionStatus;

  @Column({ type: 'text', nullable: true })
  agenda: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  topics: string[];

  @Column({ type: 'jsonb', nullable: true })
  actionItems: {
    description: string;
    assignedTo: 'mentor' | 'mentee';
    dueDate?: string;
    completed: boolean;
  }[];

  @Column({ type: 'int', nullable: true })
  mentorRating: number;

  @Column({ type: 'int', nullable: true })
  menteeRating: number;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
