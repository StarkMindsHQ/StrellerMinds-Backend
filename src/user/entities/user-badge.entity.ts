import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { Badge } from './badge.entity';

@Entity('user_badges')
export class UserBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserProfile, (profile) => profile.badges, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_id' })
  profile: UserProfile;

  @Column({ type: 'uuid', name: 'profile_id' })
  profileId: string;

  @ManyToOne(() => Badge, (badge) => badge.userBadges, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'badge_id' })
  badge: Badge;

  @Column({ type: 'uuid', name: 'badge_id' })
  badgeId: string;

  @Column({ type: 'text', nullable: true })
  unlockedReason: string; // Why the badge was awarded

  @Column({ type: 'boolean', default: true })
  isVisible: boolean;

  @Column({ type: 'int', default: 1 })
  level: number; // Badge level (for progressive badges)

  @CreateDateColumn()
  awardedAt: Date;
}
