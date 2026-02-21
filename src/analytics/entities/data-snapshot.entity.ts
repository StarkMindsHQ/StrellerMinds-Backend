import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('data_snapshots')
@Index(['snapshotType', 'snapshotDate'])
export class DataSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  snapshotType: string;

  @Column({ type: 'date' })
  snapshotDate: Date;

  @Column({ type: 'jsonb' })
  data: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    recordCount: number;
    processingTime: number;
    dataSource: string;
  };

  @CreateDateColumn()
  createdAt: Date;
}
