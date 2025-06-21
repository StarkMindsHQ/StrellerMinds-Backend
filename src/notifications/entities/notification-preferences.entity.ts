import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('notification_preferences')
export class NotificationPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  userId: string;

  @Column({ default: true })
  courseUpdates: boolean;

  @Column({ default: true })
  assignments: boolean;

  @Column({ default: true })
  announcements: boolean;

  @Column({ default: true })
  achievements: boolean;

  @Column({ default: true })
  reminders: boolean;

  @Column({ default: false })
  marketing: boolean;

  @Column('json', { nullable: true })
  mutedTopics?: string[];

  @Column({ nullable: true })
  quietHoursStart?: string;

  @Column({ nullable: true })
  quietHoursEnd?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
