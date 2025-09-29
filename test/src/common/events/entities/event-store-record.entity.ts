import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('event_store')
@Index(['aggregateId', 'aggregateType'])
@Index(['eventType'])
@Index(['timestamp'])
@Index(['position'])
export class EventStoreRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', unique: true })
  eventId: string;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column({ name: 'aggregate_id' })
  aggregateId: string;

  @Column({ name: 'aggregate_type' })
  aggregateType: string;

  @Column({ name: 'event_version', type: 'int' })
  eventVersion: number;

  @Column({ name: 'event_data', type: 'jsonb' })
  eventData: any;

  @Column({ name: 'metadata', type: 'jsonb' })
  metadata: any;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;

  @Column({ name: 'position', type: 'bigint', generated: 'increment' })
  position: number;

  @Column({ name: 'correlation_id', nullable: true })
  correlationId?: string;

  @Column({ name: 'causation_id', nullable: true })
  causationId?: string;
}
