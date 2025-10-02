import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('aggregate_snapshots')
@Index(['aggregateId', 'aggregateType'], { unique: true })
export class AggregateSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'aggregate_id' })
  aggregateId: string;

  @Column({ name: 'aggregate_type' })
  aggregateType: string;

  @Column({ name: 'version', type: 'int' })
  version: number;

  @Column({ name: 'snapshot_data', type: 'jsonb' })
  snapshotData: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
