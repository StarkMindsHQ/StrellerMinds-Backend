import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('api_usage_logs')
export class ApiUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  version: string;

  @Column()
  endpoint: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ default: false })
  deprecated: boolean;

  @CreateDateColumn()
  timestamp: Date;
}
