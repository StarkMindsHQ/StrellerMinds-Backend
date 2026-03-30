import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../user/user.entity';

export enum ConfigType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  ARRAY = 'array'
}

export enum ConfigEnvironment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

export enum ConfigStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated'
}

@Entity('configurations')
export class Configuration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column({ type: 'enum', enum: ConfigType })
  type: ConfigType;

  @Column('text')
  value: string;

  @Column({ type: 'enum', enum: ConfigEnvironment })
  environment: ConfigEnvironment;

  @Column({ type: 'enum', enum: ConfigStatus, default: ConfigStatus.ACTIVE })
  status: ConfigStatus;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: false })
  isEncrypted: boolean;

  @Column({ default: false })
  isFeatureFlag: boolean;

  @Column({ nullable: true })
  version: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  validationSchema: string;

  @ManyToOne(() => User)
  createdBy: User;

  @ManyToOne(() => User)
  updatedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastValidatedAt: Date;

  @Column({ default: false })
  requiresRestart: boolean;

  @Column({ type: 'json', nullable: true })
  rollbackValue: {
    value: string;
    updatedAt: Date;
    updatedBy: string;
  };

  @OneToMany(() => ConfigurationAudit, 'configuration')
  auditTrail: ConfigurationAudit[];
}

@Entity('configuration_audit')
export class ConfigurationAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Configuration)
  configuration: Configuration;

  @Column()
  oldValue: string;

  @Column()
  newValue: string;

  @Column()
  action: string;

  @ManyToOne(() => User)
  performedBy: User;

  @Column()
  performedAt: Date;

  @Column({ nullable: true })
  reason: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;
}

@Entity('feature_flags')
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ default: false })
  enabled: boolean;

  @Column({ type: 'enum', enum: ConfigEnvironment })
  environment: ConfigEnvironment;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  conditions: {
    userRoles?: string[];
    userSegments?: string[];
    percentage?: number;
    customRules?: Record<string, any>;
  };

  @Column({ type: 'json', nullable: true })
  rolloutStrategy: {
    type: 'immediate' | 'gradual' | 'scheduled';
    percentage?: number;
    startDate?: Date;
    endDate?: Date;
  };

  @ManyToOne(() => User)
  createdBy: User;

  @ManyToOne(() => User)
  updatedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  isGlobal: boolean;

  @Column({ type: 'json', nullable: true })
  metrics: {
    impressions: number;
    conversions: number;
    errors: number;
  };
}
