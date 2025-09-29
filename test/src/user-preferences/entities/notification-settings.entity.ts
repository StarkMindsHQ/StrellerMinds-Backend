import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';

@Entity('notification_settings')
export class NotificationSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: true })
  emailEnabled: boolean;

  @Column({ default: false })
  smsEnabled: boolean;

  @Column({ default: false })
  pushEnabled: boolean;

  @Column({ default: 'immediate' })
  frequency: 'immediate' | 'daily' | 'weekly';

  @Column('jsonb', { nullable: true })
  rules: Record<string, any>;
} 