import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiVersion } from './api-version.entity';

export enum EndpointStatus {
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
  REMOVED = 'removed',
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

@Entity('api_endpoints')
@Index(['versionId', 'path', 'method'])
export class ApiEndpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  path: string; // e.g., "/api/users/:id"

  @Column({ type: 'enum', enum: HttpMethod })
  method: HttpMethod;

  @Column()
  summary: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: EndpointStatus, default: EndpointStatus.ACTIVE })
  status: EndpointStatus;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb', nullable: true })
  parameters?: Array<{
    name: string;
    in: 'query' | 'path' | 'header' | 'body';
    required: boolean;
    type: string;
    description?: string;
    example?: any;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  requestBody?: {
    contentType: string;
    schema: any;
    example?: any;
  };

  @Column({ type: 'jsonb', nullable: true })
  responses?: Record<
    string,
    {
      description: string;
      schema?: any;
      example?: any;
    }
  >;

  @Column({ type: 'jsonb', nullable: true })
  codeExamples?: {
    curl?: string;
    javascript?: string;
    python?: string;
    typescript?: string;
    java?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  rateLimit?: {
    requests: number;
    period: string; // "hour", "minute", "day"
  };

  @Column({ type: 'jsonb', nullable: true })
  authentication?: string[]; // ["bearer", "api_key"]

  @Column({ type: 'timestamp', nullable: true })
  deprecationDate?: Date;

  @Column({ type: 'text', nullable: true })
  deprecationNotice?: string;

  @Column({ type: 'text', nullable: true })
  migrationPath?: string;

  @Column()
  versionId: string;

  @ManyToOne(() => ApiVersion, (version) => version.endpoints)
  @JoinColumn({ name: 'versionId' })
  version: ApiVersion;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
