/* eslint-disable prettier/prettier */
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('search_analytics')
export class SearchAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  @Index()
  searchTerm: string;

  @Column({ default: 'all' })
  searchType: string;

  @Column({ type: 'text', nullable: true })
  filters: string;

  @Column({ default: 0 })
  resultCount: number;

  @Column({ default: 0 })
  processingTimeMs: number;

  @Column({ nullable: true })
  @Index()
  userId: string;

  @CreateDateColumn()
  @Index()
  timestamp: Date;
}
