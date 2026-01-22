import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { PortfolioItem } from './portfolio-item.entity';
import { UserBadge } from './user-badge.entity';
import { Follow } from './follow.entity';
import { PrivacySettings } from './privacy-settings.entity';

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  // Profile Customization
  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  headline: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profilePhotoUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  coverPhotoUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string;

  // Social Links
  @Column({ type: 'jsonb', nullable: true, default: {} })
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    [key: string]: string | undefined;
  };

  // Professional Info
  @Column({ type: 'varchar', length: 255, nullable: true })
  skills: string; // Comma-separated or JSON stored

  @Column({ type: 'varchar', length: 255, nullable: true })
  specialization: string;

  @Column({ type: 'int', nullable: true })
  yearsOfExperience: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  education: string;

  // Profile Stats
  @Column({ type: 'int', default: 0 })
  followersCount: number;

  @Column({ type: 'int', default: 0 })
  followingCount: number;

  @Column({ type: 'int', default: 0 })
  portfolioItemsCount: number;

  @Column({ type: 'int', default: 0 })
  badgesCount: number;

  @Column({ type: 'int', default: 0 })
  profileViews: number;

  // Customization Preferences
  @Column({ type: 'jsonb', nullable: true, default: {} })
  theme: {
    primaryColor?: string;
    accentColor?: string;
    layout?: 'grid' | 'list' | 'minimal';
  };

  @Column({ type: 'boolean', default: true })
  showBadges: boolean;

  @Column({ type: 'boolean', default: true })
  showPortfolio: boolean;

  @Column({ type: 'boolean', default: true })
  showActivity: boolean;

  // Verification & Status
  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'varchar', length: 50, default: 'complete' })
  completionStatus: 'incomplete' | 'partial' | 'complete'; // Profile completeness

  @Column({ type: 'int', default: 0 })
  completionPercentage: number;

  // Relationships
  @OneToMany(() => PortfolioItem, (portfolio) => portfolio.profile, {
    cascade: true,
  })
  portfolioItems: PortfolioItem[];

  @OneToMany(() => UserBadge, (badge) => badge.profile, {
    cascade: true,
  })
  badges: UserBadge[];

  @OneToMany(() => Follow, (follow) => follow.follower, {
    cascade: true,
  })
  following: Follow[];

  @OneToMany(() => Follow, (follow) => follow.following, {
    cascade: true,
  })
  followers: Follow[];

  @OneToOne(() => PrivacySettings, (privacy) => privacy.profile, {
    cascade: true,
  })
  privacySettings: PrivacySettings;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
