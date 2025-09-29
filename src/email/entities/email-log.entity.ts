import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from "typeorm";
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Entity representing an email log entry.
 */
@Entity("email_logs")
export class EmailLog {
  /** Unique ID for the email log entry */
  @ApiProperty({ description: 'Unique ID for the email log entry', example: 'uuid-v4' })
  @PrimaryGeneratedColumn("uuid")
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
  @ApiProperty({ description: 'Email status', enum: ['sent', 'failed', 'opened', 'clicked'], example: 'sent' })
  @Column()
  @Index()
  status: "sent" | "failed" | "opened" | "clicked";

  /** Error message (optional) */
  @ApiPropertyOptional({ description: 'Error message', example: 'SMTP connection failed' })
  @Column({ nullable: true })
  error: string;

  /** Date/time when the email was created */
  @ApiProperty({ description: 'Date/time when the email was created', type: String, format: 'date-time', example: '2025-06-29T12:00:00Z' })
  @CreateDateColumn()
  @Index()
  createdAt: Date;

  /** Date/time when the email was opened (optional) */
  @ApiPropertyOptional({ description: 'Date/time when the email was opened', type: String, format: 'date-time', example: '2025-06-29T12:05:00Z' })
  @Column({ nullable: true })
  openedAt: Date;

  /** Date/time when the email was clicked (optional) */
  @ApiPropertyOptional({ description: 'Date/time when the email was clicked', type: String, format: 'date-time', example: '2025-06-29T12:10:00Z' })
  @Column({ nullable: true })
  clickedAt: Date;

  /** Additional metadata (optional) */
  @ApiPropertyOptional({ description: 'Additional metadata', type: 'object', example: { ip: '127.0.0.1' } })
  @Column({ nullable: true, type: "jsonb" })
  metadata: Record<string, any>;
}

