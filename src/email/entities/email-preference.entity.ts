import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Enum for email preference types.
 */
export enum EmailType {
  AUTHENTICATION = 'authentication',
  MARKETING = 'marketing',
  COURSE_UPDATES = 'course_updates',
  FORUM_NOTIFICATIONS = 'forum_notifications',
  SYSTEM_NOTIFICATIONS = 'system_notifications',
}

/**
 * Entity representing a user's email preference.
 */
@Entity('email_preferences')
@Unique(['email', 'emailType'])
export class EmailPreference {
  /** Unique ID for the email preference */
  @ApiProperty({ description: 'Unique ID for the email preference', example: 'uuid-v4' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** User email address */
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @Column()
  @Index()
  email: string;

  /** Email type */
  @ApiProperty({ enum: EmailType, description: 'Email type', default: EmailType.AUTHENTICATION })
  @Column({
    type: 'enum',
    enum: EmailType,
    default: EmailType.AUTHENTICATION,
  })
  @Index()
  emailType: EmailType;

  /** Whether the user has opted out */
  @ApiProperty({ description: 'Whether the user has opted out', example: false })
  @Column({ default: false })
  optOut: boolean;

  /** Date/time when the preference was created */
  @ApiProperty({
    description: 'Date/time when the preference was created',
    type: String,
    format: 'date-time',
    example: '2025-06-29T12:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  /** Date/time when the preference was last updated */
  @ApiProperty({
    description: 'Date/time when the preference was last updated',
    type: String,
    format: 'date-time',
    example: '2025-06-29T12:10:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
