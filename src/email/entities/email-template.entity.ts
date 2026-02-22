import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

export enum TemplateStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum TemplateCategory {
  TRANSACTIONAL = 'transactional',
  MARKETING = 'marketing',
  NOTIFICATION = 'notification',
  DIGEST = 'digest',
  SYSTEM = 'system',
}

@Entity('email_templates')
@Index(['slug', 'status'])
export class EmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  @Index({ unique: true })
  slug: string; // e.g. 'welcome-email', 'password-reset'

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: TemplateCategory, default: TemplateCategory.TRANSACTIONAL })
  category: TemplateCategory;

  @Column({ type: 'enum', enum: TemplateStatus, default: TemplateStatus.DRAFT })
  status: TemplateStatus;

  @Column({ type: 'int', default: 1 })
  currentVersion: number;

  @Column({ type: 'jsonb', default: [] })
  availableLocales: string[]; // ['en', 'es', 'fr']

  @Column({ type: 'varchar', length: 10, default: 'en' })
  defaultLocale: string;

  @Column({ type: 'jsonb', nullable: true })
  variables: TemplateVariable[]; // documented input variables

  @Column({ type: 'boolean', default: false })
  abTestingEnabled: boolean;

  @Column({ type: 'uuid', nullable: true })
  activeAbTestId: string;

  @Column({ type: 'uuid' })
  createdById: string;

  @Column({ type: 'uuid', nullable: true })
  updatedById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'url' | 'html';
  required: boolean;
  defaultValue?: string;
  description?: string;
  example?: string;
}
