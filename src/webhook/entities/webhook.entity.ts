import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum WebhookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FAILED = 'failed',
}

export enum WebhookEvent {
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  ORDER_CREATED = 'order.created',
  ORDER_UPDATED = 'order.updated',
  ORDER_COMPLETED = 'order.completed',
  PAYMENT_PROCESSED = 'payment.processed',
  CUSTOM_EVENT = 'custom.event',
}

@Entity('webhooks')
@Index(['status'])
@Index(['events'])
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'simple-array' })
  events: WebhookEvent[];

  @Column({
    type: 'enum',
    enum: WebhookStatus,
    default: WebhookStatus.ACTIVE,
  })
  status: WebhookStatus;

  @Column({ type: 'text', nullable: true })
  secret: string;

  @Column({ type: 'json', nullable: true })
  headers: Record<string, string>;

  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  @Column({ type: 'int', default: 30 })
  timeoutSeconds: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
