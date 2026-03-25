import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('webhook_logs')
@Index(['provider', 'eventType'])
@Index(['status', 'timestamp'])
@Index(['timestamp'])
export class WebhookLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  provider: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  eventType: string;

  @Column({
    type: 'enum',
    enum: ['success', 'failed', 'retry'],
    default: 'success',
  })
  @Index()
  status: 'success' | 'failed' | 'retry';

  @Column({ type: 'int', default: 0 })
  duration: number;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ type: 'jsonb', nullable: true })
  payload?: any;

  @Column({ type: 'jsonb', nullable: true })
  headers?: Record<string, string>;

  @Column({ type: 'varchar', length: 45, nullable: true })
  @Index()
  ipAddress?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent?: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  @Index()
  timestamp: Date;
}
