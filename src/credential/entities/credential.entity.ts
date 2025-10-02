/**
 * Credential entity representing issued credentials.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('credentials')
export class Credential {
  /** Credential ID (UUID) */
  @ApiProperty({ description: 'Credential ID', example: 'uuid-v4' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** User ID (UUID) */
  @ApiProperty({ description: 'User ID', example: 'uuid-user' })
  @Column()
  userId: string;

  /** Credential type */
  @ApiProperty({ description: 'Credential type', example: 'course-completion' })
  @Column()
  type: string;

  /** Credential name */
  @ApiProperty({ description: 'Credential name', example: 'Blockchain Basics Certificate' })
  @Column()
  name: string;

  /** Credential metadata (arbitrary JSON) */
  @ApiProperty({ description: 'Credential metadata', type: 'object', example: { score: 95 } })
  @Column({ type: 'jsonb' })
  metadata: Record<string, any>;

  /** Issuer ID (UUID) */
  @ApiProperty({ description: 'Issuer ID', example: 'uuid-issuer' })
  @Column()
  issuerId: string;

  /** Issuer name */
  @ApiProperty({ description: 'Issuer name', example: 'Streller Academy' })
  @Column()
  issuerName: string;

  /** Date issued */
  @ApiProperty({
    description: 'Date issued',
    example: '2025-06-29T12:00:00Z',
    type: String,
    format: 'date-time',
  })
  @CreateDateColumn()
  issuedAt: Date;

  /** Date expires (optional) */
  @ApiPropertyOptional({
    description: 'Date expires',
    example: '2026-06-29T12:00:00Z',
    type: String,
    format: 'date-time',
  })
  @Column({ nullable: true })
  expiresAt: Date;

  /** Credential status */
  @ApiProperty({ description: 'Credential status', example: 'active' })
  @Column()
  status: string;

  /** Blockchain transaction hash */
  @ApiProperty({ description: 'Blockchain transaction hash', example: '0x123...' })
  @Column()
  txHash: string;

  /** Blockchain network */
  @ApiProperty({ description: 'Blockchain network', example: 'stellar' })
  @Column()
  network: string;

  /** Block height of the transaction */
  @ApiProperty({ description: 'Block height', example: 123456 })
  @Column()
  blockHeight: number;

  /** Credential verification status */
  @ApiProperty({ description: 'Credential verification status', example: true })
  @Column({ default: false })
  verificationStatus: boolean;

  /** Date last updated */
  @ApiProperty({
    description: 'Date last updated',
    example: '2025-07-01T12:00:00Z',
    type: String,
    format: 'date-time',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
