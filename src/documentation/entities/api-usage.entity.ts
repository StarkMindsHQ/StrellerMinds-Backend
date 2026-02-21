import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiKey } from './api-key.entity';

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

@Entity('api_usage')
@Index(['apiKeyId', 'timestamp'])
@Index(['endpoint', 'method', 'timestamp'])
@Index(['statusCode', 'timestamp'])
export class ApiUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  apiKeyId: string;

  @ManyToOne(() => ApiKey)
  @JoinColumn({ name: 'apiKeyId' })
  apiKey: ApiKey;

  @Column()
  endpoint: string;

  @Column({ type: 'enum', enum: HttpMethod })
  method: HttpMethod;

  @Column({ type: 'int' })
  statusCode: number;

  @Column({ type: 'int' })
  responseTime: number; // milliseconds

  @Column({ type: 'bigint', nullable: true })
  requestSize?: number; // bytes

  @Column({ type: 'bigint', nullable: true })
  responseSize?: number; // bytes

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ type: 'jsonb', nullable: true })
  queryParams?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  requestHeaders?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  errorDetails?: {
    message: string;
    code?: string;
    stack?: string;
  };

  @CreateDateColumn()
  timestamp: Date;
}
