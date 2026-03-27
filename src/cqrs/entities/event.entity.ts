import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('events')
export class EventEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  aggregateId: string;

  @Column()
  eventType: string;

  @Column('jsonb')
  eventData: any;

  @Column()
  version: number;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ nullable: true })
  userId?: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;
}
