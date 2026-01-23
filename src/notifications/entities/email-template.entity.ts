import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum EmailTemplateType {
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  COURSE_UPDATE = 'course_update',
  DEADLINE_REMINDER = 'deadline_reminder',
  ANNOUNCEMENT = 'announcement',
  DIGEST = 'digest',
  SECURITY_ALERT = 'security_alert',
  ACCOUNT_SUSPENDED = 'account_suspended',
}

@Entity('email_templates')
export class EmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'enum', enum: EmailTemplateType })
  type: EmailTemplateType;

  @Column({ type: 'text' })
  subject: string;

  @Column({ type: 'text' })
  htmlContent: string;

  @Column({ type: 'text', nullable: true })
  textContent?: string;

  @Column({ type: 'json', default: {} })
  placeholders: Record<string, string>;

  @Column({ type: 'json', default: {} })
  languages: Record<string, {
    subject: string;
    htmlContent: string;
    textContent?: string;
  }>;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}