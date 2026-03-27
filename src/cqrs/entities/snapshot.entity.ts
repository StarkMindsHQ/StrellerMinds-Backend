import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('snapshots')
export class SnapshotEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  aggregateId: string;

  @Column()
  aggregateType: string;

  @Column('jsonb')
  data: any;

  @Column()
  version: number;

  @CreateDateColumn()
  timestamp: Date;
}
