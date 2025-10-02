import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('error_logs')
export class ErrorLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  @Index()
  correlationId: string;

  @Column()
  @Index()
  errorCode: string;

  @Column()
  errorMessage: string;

  @Column()
  statusCode: number;

  @Column()
  endpoint: string;

  @Column()
  method: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  ip: string;

  @Column({ type: 'text', nullable: true })
  stackTrace: string;

  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  @Index()
  severity: string;

  @Column({
    type: 'enum',
    enum: ['AUTHENTICATION', 'RESOURCE', 'VALIDATION', 'BUSINESS_LOGIC', 'SYSTEM', 'UNKNOWN'],
    default: 'UNKNOWN',
  })
  @Index()
  category: string;

  @CreateDateColumn()
  @Index()
  timestamp: Date;
}
