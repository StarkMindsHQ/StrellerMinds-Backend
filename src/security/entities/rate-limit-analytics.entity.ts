import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('rate_limit_analytics')
export class RateLimitAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ip: string;

  @Column({ nullable: true })
  userId: string;

  @Column()
  endpoint: string;

  @Column()
  method: string;

  @Column({ default: 429 })
  statusCode: number;

  @Column({ nullable: true })
  throttlerName: string;

  @Column({ default: 1 })
  violationCount: number;

  @CreateDateColumn()
  timestamp: Date;
}
