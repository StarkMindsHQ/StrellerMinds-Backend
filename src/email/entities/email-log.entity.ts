import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Entity representing an email log entry.
 */
@Entity('email_logs')
export class EmailLog {
  /** Unique ID for the email log entry */
  @ApiProperty({ description: 'Unique ID for the email log entry', example: 'uuid-v4' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Recipient email address */
  @ApiProperty({ description: 'Recipient email address', example: 'user@example.com' })
  @Column()
  @Index()
  recipient: string;

  /** Email subject */
  @ApiProperty({ description: 'Email subject', example: 'Welcome to Streller!' })
  @Column()
  subject: string;

  /** Email template name */
  @ApiProperty({ description: 'Email template name', example: 'welcome-template' })
  @Column()
  @Index()
  templateName: string;

  /** Message ID from the email provider (optional) */
  @ApiPropertyOptional({ description: 'Message ID from the email provider', example: 'abc123' })
  @Column({ nullable: true })
  messageId: string;

  /** Email status */
  @ApiProperty({
    description: 'Email status',
    enum: ['sent', 'failed', 'opened', 'clicked'],
    example: 'sent',
  })
  @Column()
  @Index()
  status: 'sent' | 'failed' | 'opened' | 'clicked';

  /** Error message (optional) */
  @ApiPropertyOptional({ description: 'Error message', example: 'SMTP connection failed' })
  @Column({ nullable: true })
  error: string;

  /** Date/time when the email was created */
  @ApiProperty({
    description: 'Date/time when the email was created',
    type: String,
    format: 'date-time',
    example: '2025-06-29T12:00:00Z',
  })
  @CreateDateColumn()
  @Index()
  createdAt: Date;

  /** Date/time when the email was opened (optional) */
  @ApiPropertyOptional({
    description: 'Date/time when the email was opened',
    type: String,
    format: 'date-time',
    example: '2025-06-29T12:05:00Z',
  })
  @Column({ nullable: true })
  openedAt: Date;

  /** Date/time when the email was clicked (optional) */
  @ApiPropertyOptional({
    description: 'Date/time when the email was clicked',
    type: String,
    format: 'date-time',
    example: '2025-06-29T12:10:00Z',
  })
  @Column({ nullable: true })
  clickedAt: Date;

  /** Additional metadata (optional) */
  @ApiPropertyOptional({
    description: 'Additional metadata',
    type: 'object',
    example: { ip: '127.0.0.1' },
  })
  @Column({ nullable: true, type: 'jsonb' })
  metadata: Record<string, any>;

  /** First opened timestamp */
  @ApiPropertyOptional({
    description: 'First time the email was opened',
    type: String,
    format: 'date-time',
  })
  @Column({ type: 'timestamp', nullable: true })
  @Index()
  firstOpenedAt: Date | null;

  /** Total number of opens */
  @ApiPropertyOptional({ description: 'Total number of opens', example: 0 })
  @Column({ type: 'int', default: 0 })
  openCount: number;

  /** First clicked timestamp */
  @ApiPropertyOptional({
    description: 'First time a link was clicked',
    type: String,
    format: 'date-time',
  })
  @Column({ type: 'timestamp', nullable: true })
  @Index()
  firstClickedAt: Date | null;

  /** Total number of clicks */
  @ApiPropertyOptional({ description: 'Total number of clicks', example: 0 })
  @Column({ type: 'int', default: 0 })
  clickCount: number;

  /** Click events history */
  @ApiPropertyOptional({
    description: 'Array of click events',
    type: 'array',
    example: [{ clickedAt: '2025-06-29T12:10:00Z', url: 'https://example.com' }],
  })
  @Column({ type: 'jsonb', nullable: true })
  clickEvents: Array<{
    clickedAt: string;
    url: string;
    userAgent?: string;
    ipAddress?: string;
  }> | null;

  /** Whether tracking is enabled for this email */
  @ApiPropertyOptional({ description: 'Tracking enabled for this email', example: true })
  @Column({ type: 'boolean', default: false })
  @Index()
  trackingEnabled: boolean;

  /** Unique tracking token for this email */
  @ApiPropertyOptional({ description: 'Unique tracking token', example: 'a1b2c3...' })
  @Column({ type: 'varchar', length: 64, nullable: true })
  @Index()
  trackingToken: string | null;

  /** When the log was last updated */
  @ApiPropertyOptional({
    description: 'Date/time when the email log was last updated',
    type: String,
    format: 'date-time',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
