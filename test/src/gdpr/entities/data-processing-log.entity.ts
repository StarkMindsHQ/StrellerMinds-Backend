import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Enum for processing activities.
 */
export enum ProcessingActivity {
  DATA_EXPORT = 'data_export',
  DATA_DELETION = 'data_deletion',
  DATA_ACCESS = 'data_access',
  DATA_UPDATE = 'data_update',
  CONSENT_UPDATE = 'consent_update',
}

/**
 * Entity representing a data processing log entry.
 */
@Entity('data_processing_logs')
export class DataProcessingLog {
  /** Log entry ID */
  @ApiProperty({ description: 'Log entry ID', example: 'uuid-v4' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** User ID */
  @ApiProperty({ description: 'User ID', example: 'uuid-user' })
  @Column('uuid')
  userId: string;

  /** Processing activity */
  @ApiProperty({
    enum: ProcessingActivity,
    description: 'Processing activity',
    example: ProcessingActivity.DATA_EXPORT,
  })
  @Column({
    type: 'enum',
    enum: ProcessingActivity,
  })
  activity: ProcessingActivity;

  /** Description of the activity */
  @ApiProperty({
    description: 'Description of the activity',
    example: 'Exported user data',
  })
  @Column({ type: 'text' })
  description: string;

  /** Additional metadata (optional) */
  @ApiPropertyOptional({
    description: 'Additional metadata',
    type: 'object',
    example: { exportId: 'abc123' },
  })
  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  /** IP address */
  @ApiProperty({ description: 'IP address', example: '127.0.0.1' })
  @Column({ length: 45 })
  ipAddress: string;

  /** User agent (optional) */
  @ApiPropertyOptional({
    description: 'User agent',
    example: 'Mozilla/5.0',
  })
  @Column({ type: 'text', nullable: true })
  userAgent: string;

  /** Date/time when the log was created */
  @ApiProperty({
    description: 'Date/time when the log was created',
    type: String,
    format: 'date-time',
    example: '2025-06-29T12:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;
}
