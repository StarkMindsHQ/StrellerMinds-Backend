import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../../auth/entities/user.entity';

export enum MentorshipStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export enum MentorshipType {
  ONE_ON_ONE = 'one_on_one',
  GROUP = 'group',
  PEER = 'peer',
}

@Entity('mentorships')
@Index(['mentorId', 'status'])
@Index(['menteeId', 'status'])
export class Mentorship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mentor_id' })
  mentorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentor_id' })
  mentor: User;

  @Column({ name: 'mentee_id' })
  menteeId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentee_id' })
  mentee: User;

  @Column({ type: 'enum', enum: MentorshipStatus, default: MentorshipStatus.PENDING })
  status: MentorshipStatus;

  @Column({ type: 'enum', enum: MentorshipType, default: MentorshipType.ONE_ON_ONE })
  type: MentorshipType;

  @Column({ type: 'text', nullable: true })
  goals: string;

  @Column({ type: 'jsonb', nullable: true })
  focusAreas: string[];

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'int', default: 0 })
  sessionsCompleted: number;

  @Column({ type: 'int', nullable: true })
  targetSessions: number;

  @Column({ type: 'jsonb', nullable: true })
  schedule: {
    frequency: string;
    duration: number;
    preferredDays: string[];
    preferredTime: string;
  };

  @Column({ type: 'text', nullable: true })
  notes: string;

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
