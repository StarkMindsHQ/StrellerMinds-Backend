import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * User entity for email verification context.
 */
@Entity('users')
export class User {
  /** User ID (UUID) */
  @ApiProperty({ description: 'User ID', example: 'uuid-v4' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** User email address */
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @Column({ unique: true })
  email: string;

  /** User password (hashed) */
  @ApiProperty({ description: 'User password (hashed)' })
  @Column()
  password: string;

  /** Whether the email is verified */
  @ApiProperty({ description: 'Whether the email is verified', example: false })
  @Column({ default: false })
  isEmailVerified: boolean;

  /** Email verification token (optional) */
  @ApiPropertyOptional({ description: 'Email verification token', example: 'token-uuid' })
  @Column({ nullable: true })
  emailVerificationToken: string;

  /** Email verification token expiry (optional) */
  @ApiPropertyOptional({
    description: 'Email verification token expiry',
    type: String,
    format: 'date-time',
    example: '2025-06-30T12:00:00Z',
  })
  @Column({ nullable: true })
  emailVerificationTokenExpiry: Date;

  /** Date/time when the user was created */
  @ApiProperty({
    description: 'Date/time when the user was created',
    type: String,
    format: 'date-time',
    example: '2025-06-29T12:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  /** Date/time when the user was last updated */
  @ApiProperty({
    description: 'Date/time when the user was last updated',
    type: String,
    format: 'date-time',
    example: '2025-06-29T12:10:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
