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

export enum EventType {
  WORKSHOP = 'workshop',
  WEBINAR = 'webinar',
  MEETUP = 'meetup',
  HACKATHON = 'hackathon',
  STUDY_SESSION = 'study_session',
  NETWORKING = 'networking',
  CONFERENCE = 'conference',
}

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('community_events')
@Index(['type', 'status'])
@Index(['startDate', 'endDate'])
export class CommunityEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: EventType })
  type: EventType;

  @Column({ type: 'enum', enum: EventStatus, default: EventStatus.DRAFT })
  status: EventStatus;

  @Column({ name: 'organizer_id' })
  organizerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizer_id' })
  organizer: User;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  timezone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string;

  @Column({ type: 'text', nullable: true })
  virtualLink: string;

  @Column({ type: 'boolean', default: false })
  isVirtual: boolean;

  @Column({ type: 'int', nullable: true })
  maxAttendees: number;

  @Column({ type: 'int', default: 0 })
  registeredCount: number;

  @Column({ type: 'int', default: 0 })
  attendedCount: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  coverImage: string;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true })
  speakers: {
    name: string;
    title: string;
    bio: string;
    photo: string;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  agenda: {
    time: string;
    title: string;
    description: string;
    speaker: string;
  }[];

  @Column({ type: 'boolean', default: false })
  requiresApproval: boolean;

  @Column({ type: 'boolean', default: true })
  allowWaitlist: boolean;

  @Column({ type: 'int', default: 0 })
  gamificationPoints: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
