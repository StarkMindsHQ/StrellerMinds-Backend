import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import type { NotificationChannel, NotificationType } from './notification.entity';

@Entity('user_notification_preferences')
@Index(['userId'], { unique: true })
export class UserNotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @Column({ type: 'boolean', default: true })
  emailEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  smsEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  inAppEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  pushEnabled: boolean;

  // Stores preferences per notification type, e.g., { "COURSE_UPDATE": ["EMAIL", "IN_APP"] }
  @Column({ type: 'jsonb', nullable: true })
  typePreferences: { [key in NotificationType]?: NotificationChannel[] } | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.notificationPreferences, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
