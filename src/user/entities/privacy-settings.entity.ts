import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { UserProfile } from './user-profile.entity';

@Entity('privacy_settings')
export class PrivacySettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => UserProfile, (profile) => profile.privacySettings, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_id' })
  profile: UserProfile;

  @Column({ type: 'uuid', name: 'profile_id' })
  profileId: string;

  // Profile Visibility
  @Column({ type: 'varchar', length: 50, default: 'public' })
  profileVisibility: 'public' | 'private' | 'friends-only'; // Who can view profile

  @Column({ type: 'varchar', length: 50, default: 'public' })
  portfolioVisibility: 'public' | 'private' | 'friends-only';

  @Column({ type: 'varchar', length: 50, default: 'public' })
  badgesVisibility: 'public' | 'private' | 'friends-only';

  @Column({ type: 'varchar', length: 50, default: 'public' })
  activityVisibility: 'public' | 'private' | 'friends-only';

  // Contact & Discovery
  @Column({ type: 'boolean', default: true })
  allowMessaging: boolean;

  @Column({ type: 'boolean', default: true })
  allowFollowing: boolean;

  @Column({ type: 'boolean', default: true })
  allowMentions: boolean;

  @Column({ type: 'boolean', default: true })
  showInSearch: boolean;

  @Column({ type: 'boolean', default: true })
  showInRecommendations: boolean;

  // Data Sharing
  @Column({ type: 'boolean', default: false })
  shareActivityFeed: boolean;

  @Column({ type: 'boolean', default: false })
  shareAnalytics: boolean;

  @Column({ type: 'boolean', default: false })
  allowThirdPartyIntegrations: boolean;

  // Communication Preferences
  @Column({ type: 'boolean', default: true })
  emailNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  pushNotifications: boolean;

  @Column({ type: 'boolean', default: false })
  marketingEmails: boolean;

  // Content Preferences
  @Column({ type: 'jsonb', nullable: true, default: [] })
  blockedUsers: string[]; // Array of blocked user IDs

  @Column({ type: 'jsonb', nullable: true, default: [] })
  mutedUsers: string[]; // Array of muted user IDs

  @Column({ type: 'jsonb', nullable: true, default: {} })
  customPrivacy: {
    [key: string]: string; // Custom privacy rules for specific fields
  };

  // Data Retention
  @Column({ type: 'int', nullable: true })
  dataRetentionDays: number; // Days to retain activity data

  @Column({ type: 'boolean', default: false })
  autoDeleteInactivity: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
