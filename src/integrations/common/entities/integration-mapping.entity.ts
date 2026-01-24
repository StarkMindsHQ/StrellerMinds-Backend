import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('integration_mappings')
@Index(['integrationConfigId', 'localResourceId'], { unique: true })
export class IntegrationMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  integrationConfigId: string;

  @Column('text')
  localResourceId: string;

  @Column('text')
  localResourceType: string;

  @Column('text')
  externalResourceId: string;

  @Column('text')
  externalResourceType: string;

  @Column('text', { nullable: true })
  externalPlatform: string;

  @Column('jsonb', { nullable: true })
  mappingData: Record<string, any>;

  @Column('jsonb', { nullable: true })
  syncStatus: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  lastSyncAt: Date;

  @Column({ default: true })
  isActive: boolean;
}
