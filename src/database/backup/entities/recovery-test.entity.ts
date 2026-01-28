import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum RecoveryTestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
}

@Entity('recovery_tests')
export class RecoveryTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  backupRecordId: string;

  @Column({
    type: 'enum',
    enum: RecoveryTestStatus,
    default: RecoveryTestStatus.PENDING,
  })
  status: RecoveryTestStatus;

  @Column({ type: 'int', default: 0 })
  durationMs: number;

  @Column({ type: 'int', nullable: true })
  tablesRestored: number;

  @Column({ type: 'bigint', nullable: true })
  rowsVerified: number;

  @Column({ type: 'boolean', default: false })
  integrityCheckPassed: boolean;

  @Column({ type: 'boolean', default: false })
  checksumVerified: boolean;

  @Column({ type: 'json', nullable: true })
  testResults: {
    tableChecks?: Array<{ table: string; rowCount: number; passed: boolean }>;
    constraintChecks?: { foreignKeys: number; passed: boolean };
    indexChecks?: { count: number; passed: boolean };
    queryTests?: Array<{ query: string; passed: boolean; error?: string }>;
  };

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'varchar', nullable: true })
  testDatabaseName: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
