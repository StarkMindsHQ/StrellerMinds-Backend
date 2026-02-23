import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../auth/entities/user.entity';

@Entity('mentor_profiles')
export class MentorProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  bio: string;

  @Column({ type: 'jsonb' })
  expertise: string[];

  @Column({ type: 'jsonb', nullable: true })
  languages: string[];

  @Column({ type: 'int', default: 0 })
  yearsOfExperience: number;

  @Column({ type: 'int', default: 5 })
  maxMentees: number;

  @Column({ type: 'int', default: 0 })
  currentMentees: number;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  availability: {
    days: string[];
    timeSlots: string[];
    timezone: string;
  };

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ type: 'int', default: 0 })
  totalRatings: number;

  @Column({ type: 'int', default: 0 })
  totalMentorships: number;

  @Column({ type: 'int', default: 0 })
  completedMentorships: number;

  @Column({ type: 'jsonb', nullable: true })
  certifications: {
    name: string;
    issuer: string;
    date: string;
  }[];

  @Column({ type: 'text', nullable: true })
  linkedinUrl: string;

  @Column({ type: 'text', nullable: true })
  portfolioUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
