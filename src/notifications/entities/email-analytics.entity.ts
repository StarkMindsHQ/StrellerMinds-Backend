import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('email_analytics')
export class EmailAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  emailQueueId?: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column()
  recipientEmail: string;

  @Column({ type: 'text', nullable: true })
  subject?: string;

  @Column({ default: 0 })
  sentCount: number;

  @Column({ default: 0 })
  deliveredCount: number;

  @Column({ default: 0 })
  openCount: number;

  @Column({ default: 0 })
  clickCount: number;

  @Column({ default: 0 })
  bounceCount: number;

  @Column({ default: 0 })
  complaintCount: number;

  @Column({ default: 0 })
  unsubscribeCount: number;

  @Column({ type: 'json', nullable: true })
  metrics: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  eventLogs: Array<{
    event: string;
    timestamp: Date;
    data?: Record<string, any>;
  }>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
