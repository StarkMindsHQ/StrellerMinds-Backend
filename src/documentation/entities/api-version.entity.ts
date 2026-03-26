import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiEndpoint } from './api-endpoint.entity';

export enum VersionStatus {
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
  SUNSET = 'sunset',
  BETA = 'beta',
  ALPHA = 'alpha',
}

@Entity('api_versions')
export class ApiVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  version: string; // e.g., "v1", "v2"

  @Column({ type: 'enum', enum: VersionStatus, default: VersionStatus.ACTIVE })
  status: VersionStatus;

  @Column({ type: 'text', nullable: true })
  releaseNotes?: string;

  @Column({ type: 'timestamp', nullable: true })
  releaseDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  deprecationDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  sunsetDate?: Date;

  @Column({ type: 'text', nullable: true })
  migrationGuide?: string;

  @Column({ type: 'jsonb', nullable: true })
  breakingChanges?: Array<{
    endpoint: string;
    description: string;
    migration: string;
  }>;

  @Column({ type: 'boolean', default: true })
  isDefault: boolean;

  @OneToMany(() => ApiEndpoint, (endpoint) => endpoint.version)
  endpoints: ApiEndpoint[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
