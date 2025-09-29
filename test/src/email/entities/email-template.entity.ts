import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Entity representing an email template.
 */
@Entity("email_templates")
export class EmailTemplate {
  /** Unique ID for the email template */
  @ApiProperty({ description: 'Unique ID for the email template', example: 'uuid-v4' })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** Template name (unique) */
  @ApiProperty({ description: 'Template name (unique)', example: 'welcome-template' })
  @Column({ unique: true })
  name: string;

  /** Email subject */
  @ApiProperty({ description: 'Email subject', example: 'Welcome to Streller!' })
  @Column()
  subject: string;

  /** Email content (HTML/text) */
  @ApiProperty({ description: 'Email content (HTML/text)', example: '<h1>Welcome!</h1>' })
  @Column("text")
  content: string;

  /** Description (optional) */
  @ApiPropertyOptional({ description: 'Description', example: 'Template for welcome emails' })
  @Column({ nullable: true })
  description: string;

  /** Whether the template is active */
  @ApiProperty({ description: 'Whether the template is active', example: true })
  @Column({ default: true })
  isActive: boolean;

  /** Date/time when the template was created */
  @ApiProperty({ description: 'Date/time when the template was created', type: String, format: 'date-time', example: '2025-06-29T12:00:00Z' })
  @CreateDateColumn()
  createdAt: Date;

  /** Date/time when the template was last updated */
  @ApiProperty({ description: 'Date/time when the template was last updated', type: String, format: 'date-time', example: '2025-06-29T12:10:00Z' })
  @UpdateDateColumn()
  updatedAt: Date;
}

