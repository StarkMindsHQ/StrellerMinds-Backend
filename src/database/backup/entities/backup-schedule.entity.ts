import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BackupType } from './backup-record.entity';

@Entity('backup_schedules')
export class BackupSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  cronExpression: string;

  @Column({ type: 'enum', enum: BackupType, default: BackupType.FULL })
  backupType: BackupType;

  @Column({ type: 'boolean', default: true })
  isEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  compress: boolean;

  @Column({ type: 'boolean', default: true })
  encrypt: boolean;

  @Column({ type: 'boolean', default: true })
  verify: boolean;

  @Column({ type: 'boolean', default: true })
  replicateCrossRegion: boolean;

  @Column({ type: 'boolean', default: true })
  uploadToCloud: boolean;

  @Column({ type: 'int', default: 30 })
  retentionDays: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt: Date;

  @Column({ type: 'uuid', nullable: true })
  lastBackupId: string;

  @Column({ type: 'varchar', nullable: true })
  lastStatus: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
