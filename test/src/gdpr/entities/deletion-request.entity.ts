import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Enum for deletion request status.
 */
export enum DeletionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Entity representing a deletion request.
 */
@Entity('deletion_requests')
export class DeletionRequest {
  /** Deletion request ID */
  @ApiProperty({ description: 'Deletion request ID', example: 'uuid-v4' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** User ID */
  @ApiProperty({ description: 'User ID', example: 'uuid-user' })
  @Column('uuid')
  userId: string;

  /** Deletion status */
  @ApiProperty({
    enum: DeletionStatus,
    description: 'Deletion status',
    example: DeletionStatus.PENDING,
  })
  @Column({
    type: 'enum',
    enum: DeletionStatus,
    default: DeletionStatus.PENDING,
  })
  status: DeletionStatus;

  /** Reason for deletion (optional) */
  @ApiPropertyOptional({ description: 'Reason for deletion' })
  @Column({ type: 'text', nullable: true })
  reason: string;

  /** Data types to delete (optional) */
  @ApiPropertyOptional({ description: 'Data types to delete', type: [String] })
  @Column({ type: 'json', nullable: true })
  dataTypes: string[];

  /** Scheduled deletion date (optional) */
  @ApiPropertyOptional({
    description: 'Scheduled deletion date',
    type: String,
    format: 'date-time',
  })
  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  /** Date/time when deletion was completed (optional) */
  @ApiPropertyOptional({
    description: 'Date/time when deletion was completed',
    type: String,
    format: 'date-time',
  })
  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  /** Notes (optional) */
  @ApiPropertyOptional({
    description: 'Notes',
    example: 'User requested expedited deletion',
  })
  @Column({ type: 'text', nullable: true })
  notes: string;

  /** Date/time when the request was created */
  @ApiProperty({
    description: 'Date/time when the request was created',
    type: String,
    format: 'date-time',
    example: '2025-06-29T12:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  /** Date/time when the request was last updated */
  @ApiProperty({
    description: 'Date/time when the request was last updated',
    type: String,
    format: 'date-time',
    example: '2025-06-29T12:10:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
