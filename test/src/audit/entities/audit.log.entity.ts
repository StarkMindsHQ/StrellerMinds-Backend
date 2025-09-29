/**
 * AuditLog entity representing audit log records.
 */
import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @ApiProperty({ description: 'Audit log ID', example: 'uuid-v4' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Action performed', example: 'ACCOUNT_DELETED' })
  @Column()
  action: string;

  @ApiProperty({ description: 'Entity type', example: 'User' })
  @Column()
  entityType: string;

  @ApiProperty({ description: 'Entity ID', example: 'uuid-v4' })
  @Column()
  entityId: string;

  @ApiProperty({ description: 'User who performed the action', example: 'admin-uuid' })
  @Column()
  performedBy: string;

  @ApiProperty({ description: 'Details of the action', type: 'object', example: { reason: 'User request' } })
  @Column('jsonb', { default: {} })
  details: Record<string, any>;

  @ApiProperty({ description: 'Timestamp of the action', example: '2025-06-29T12:00:00Z' })
  @CreateDateColumn()
  timestamp: Date;
}
