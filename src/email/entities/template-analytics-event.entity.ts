import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum TemplateEventType {
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  CONVERTED = 'converted',
  BOUNCED = 'bounced',
  UNSUBSCRIBED = 'unsubscribed',
  SPAM_REPORTED = 'spam_reported',
}

@Entity('template_analytics_events')
@Index(['templateId', 'createdAt'])
@Index(['templateVersionId', 'eventType'])
@Index(['abTestId', 'variantId'])
export class TemplateAnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  templateId: string;

  @Column({ type: 'uuid' })
  templateVersionId: string;

  @Column({ type: 'uuid', nullable: true })
  abTestId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  variantId: string;

  @Column({ type: 'uuid' })
  recipientId: string;

  @Column({ type: 'varchar', length: 255 })
  recipientEmail: string;

  @Column({ type: 'enum', enum: TemplateEventType })
  eventType: TemplateEventType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  clickedUrl: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  locale: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
