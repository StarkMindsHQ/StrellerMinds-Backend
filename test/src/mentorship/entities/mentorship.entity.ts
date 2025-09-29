import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MentorshipSession } from './mentorship-session.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Entity representing a mentorship relationship between a mentor and mentee.
 */
@Entity('mentorships')
export class Mentorship {
  /** Unique mentorship ID */
  @ApiProperty({ description: 'Unique mentorship ID', example: 'uuid-mentorship' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Mentor user */
  @ApiProperty({ description: 'Mentor user', type: () => User })
  @ManyToOne(() => User, { nullable: false, eager: true })
  mentor: User;

  /** Mentee user */
  @ApiProperty({ description: 'Mentee user', type: () => User })
  @ManyToOne(() => User, { nullable: false, eager: true })
  mentee: User;

  /** Status of the mentorship */
  @ApiProperty({ description: 'Status', enum: ['active', 'completed', 'cancelled'], default: 'active' })
  @Column({ default: 'active' })
  status: 'active' | 'completed' | 'cancelled';

  /** Mentorship goals */
  @ApiProperty({ description: 'Mentorship goals', required: false })
  @Column({ type: 'text', nullable: true })
  goals: string;

  /** Date mentorship was created */
  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn()
  createdAt: Date;

  /** Date mentorship was last updated */
  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn()
  updatedAt: Date;

  /** Sessions associated with this mentorship */
  @ApiProperty({ description: 'Sessions', type: () => [MentorshipSession] })
  @OneToMany(() => MentorshipSession, (session) => session.mentorship)
  sessions: MentorshipSession[];
}
