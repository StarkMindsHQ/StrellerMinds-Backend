import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Enum for consent types.
 */
export enum ConsentType {
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  FUNCTIONAL = 'functional',
  NECESSARY = 'necessary',
}

/**
 * Enum for consent status.
 */
export enum ConsentStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  WITHDRAWN = 'withdrawn',
}

/**
 * Entity representing a user's consent record.
 */
@Entity('user_consents')
export class UserConsent {
  /** Consent record ID */
  @ApiProperty({ description: 'Consent record ID', example: 'uuid-v4' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** User ID */
  @ApiProperty({ description: 'User ID', example: 'uuid-user' })
  @Column('uuid')
  userId: string;

  /** Consent type */
  @ApiProperty({
    enum: ConsentType,
    description: 'Consent type',
    example: ConsentType.MARKETING,
  })
  @Column({
    type: 'enum',
    enum: ConsentType,
  })
  consentType: ConsentType;

  /** Consent status */
  @ApiProperty({
    enum: ConsentStatus,
    description: 'Consent status',
    example: ConsentStatus.GRANTED,
  })
  @Column({
    type: 'enum',
    enum: ConsentStatus,
  })
  status: ConsentStatus;

  /** Purpose of consent (optional) */
  @ApiPropertyOptional({ description: 'Purpose of consent' })
  @Column({ type: 'text', nullable: true })
  purpose: string;

  /** Legal basis for consent (optional) */
  @ApiPropertyOptional({ description: 'Legal basis for consent' })
  @Column({ type: 'text', nullable: true })
  legalBasis: string;

  /** Expiry date for consent (optional) */
  @ApiPropertyOptional({
    description: 'Expiry date for consent',
    type: String,
    format: 'date-time',
  })
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  /** Date/time when the consent was created */
  @ApiProperty({
    description: 'Date/time when the consent was created',
    type: String,
    format: 'date-time',
    example: '2025-06-29T12:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  /** Date/time when the consent was last updated */
  @ApiProperty({
    description: 'Date/time when the consent was last updated',
    type: String,
    format: 'date-time',
    example: '2025-06-29T12:10:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
