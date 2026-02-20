import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('search_logs')
export class SearchLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  query: string;

  @Index()
  @Column({ nullable: true })
  userId: string;

  @Column({ type: 'jsonb', default: {} })
  filters: Record<string, any>;

  @Column({ default: 0 })
  resultCount: number;

  @Column({ default: 0 })
  executionTimeMs: number;

  @CreateDateColumn()
  createdAt: Date;
}
