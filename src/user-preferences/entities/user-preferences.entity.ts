import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationSettings } from './notification-settings.entity';

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('jsonb', { nullable: true })
  learningCustomization: {
    preferredTopics?: string[];
    learningPace?: 'slow' | 'medium' | 'fast';
    learningGoals?: string;
  };

  @OneToOne(() => NotificationSettings, { cascade: true, eager: true })
  @JoinColumn({ name: 'notification_settings_id' })
  notificationSettings: NotificationSettings;

  @Column('jsonb', { nullable: true })
  personalizationData: {
    theme?: string;
    language?: string;
    accessibility?: string[];
  };

  @Column('jsonb', { nullable: true })
  analytics: {
    lastUpdated?: Date;
    usageStats?: Record<string, any>;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
