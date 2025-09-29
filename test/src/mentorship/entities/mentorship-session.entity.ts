import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Mentorship } from './mentorship.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Entity representing a session within a mentorship.
 */
@Entity('mentorship_sessions')
export class MentorshipSession {
  /** Unique session ID */
  @ApiProperty({ description: 'Unique session ID', example: 'uuid-session' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Mentorship this session belongs to */
  @ApiProperty({ description: 'Mentorship', type: () => Mentorship })
  @ManyToOne(() => Mentorship, (mentorship) => mentorship.sessions, { nullable: false })
  mentorship: Mentorship;

  /** Scheduled date and time for the session */
  @ApiProperty({ description: 'Scheduled date/time', example: '2025-07-01T10:00:00Z' })
  @Column({ type: 'timestamp' })
  scheduledAt: Date;

  /** Duration of the session in minutes */
  @ApiProperty({ description: 'Duration in minutes', example: 60 })
  @Column({ type: 'int', default: 60 })
  durationMinutes: number;

  /** Notes for the session */
  @ApiProperty({ description: 'Session notes', required: false })
  @Column({ type: 'text', nullable: true })
  notes: string;

  /** Status of the session */
  @ApiProperty({ description: 'Session status', enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' })
  @Column({ default: 'scheduled' })
  status: 'scheduled' | 'completed' | 'cancelled';

  /** Date session was created */
  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn()
  createdAt: Date;

  /** Date session was last updated */
  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn()
  updatedAt: Date;
}
