import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { UserProfile } from './user-profile.entity';

@Entity('profile_analytics')
export class ProfileAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserProfile, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_id' })
  profile: UserProfile;

  @Column({ type: 'uuid', name: 'profile_id' })
  profileId: string;

  // View Analytics
  @Column({ type: 'int', default: 0 })
  totalViews: number;

  @Column({ type: 'int', default: 0 })
  viewsToday: number;

  @Column({ type: 'int', default: 0 })
  viewsThisWeek: number;

  @Column({ type: 'int', default: 0 })
  viewsThisMonth: number;

  // Engagement Metrics
  @Column({ type: 'int', default: 0 })
  totalFollowsGained: number;

  @Column({ type: 'int', default: 0 })
  totalFollowsLost: number;

  @Column({ type: 'int', default: 0 })
  portfolioItemsViews: number;

  @Column({ type: 'int', default: 0 })
  portfolioItemsClicks: number;

  @Column({ type: 'int', default: 0 })
  badgesDisplays: number;

  // Traffic Sources
  @Column({ type: 'jsonb', nullable: true, default: {} })
  trafficSources: {
    direct?: number;
    search?: number;
    social?: number;
    referral?: number;
    [key: string]: number | undefined;
  };

  // Device & Location (anonymized)
  @Column({ type: 'jsonb', nullable: true, default: {} })
  deviceTypes: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };

  @Column({ type: 'jsonb', nullable: true, default: {} })
  topCountries: {
    [countryCode: string]: number;
  };

  // Interaction Data
  @Column({ type: 'int', default: 0 })
  averageSessionDuration: number; // in seconds

  @Column({ type: 'date', nullable: true })
  lastViewedAt: Date;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  recentViewers: Array<{
    userId?: string;
    timestamp: Date;
    referrer?: string;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
