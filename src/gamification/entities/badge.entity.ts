import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserBadge } from './user-badge.entity';

export enum BadgeCategory {
  ACHIEVEMENT = 'achievement',
  MILESTONE = 'milestone',
  SKILL = 'skill',
  SOCIAL = 'social',
  SPECIAL = 'special',
}

@Entity('badges')
export class Badge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ type: 'enum', enum: BadgeCategory, default: BadgeCategory.ACHIEVEMENT })
  category: BadgeCategory;

  @Column({ default: 0 })
  xpReward: number;

  @Column({ default: 0 })
  pointsReward: number;

  @Column('simple-json', { nullable: true })
  requirements: {
    type: string; // e.g., 'course_completed', 'daily_streak', 'total_points'
    value: number;
    metadata?: Record<string, any>;
  };

  @OneToMany(() => UserBadge, (userBadge) => userBadge.badge)
  userBadges: UserBadge[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
