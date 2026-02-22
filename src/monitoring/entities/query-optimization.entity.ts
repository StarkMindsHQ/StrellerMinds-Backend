import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum OptimizationStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

@Entity('query_optimizations')
@Index(['status', 'createdAt'])
export class QueryOptimization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  originalQuery: string;

  @Column({ type: 'text', nullable: true })
  optimizedQuery?: string;

  @Column({ type: 'text' })
  tableName: string;

  @Column({ type: 'float' })
  originalDuration: number; // in milliseconds

  @Column({ type: 'float', nullable: true })
  optimizedDuration?: number;

  @Column({ type: 'float', nullable: true })
  improvement?: number; // percentage improvement

  @Column({ type: 'jsonb' })
  analysis: {
    missingIndexes?: string[];
    unusedIndexes?: string[];
    tableScans?: boolean;
    joinOptimizations?: string[];
    queryPlan?: any;
  };

  @Column({ type: 'enum', enum: OptimizationStatus, default: OptimizationStatus.PENDING })
  status: OptimizationStatus;

  @Column({ type: 'text', nullable: true })
  recommendation?: string;

  @Column({ type: 'jsonb', nullable: true })
  appliedChanges?: {
    indexesCreated?: string[];
    indexesDropped?: string[];
    queryModified?: boolean;
  };

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  appliedAt?: Date;
}
