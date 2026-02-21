import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('email_template_versions')
@Index(['templateId', 'version'])
@Index(['templateId', 'locale', 'version'])
export class EmailTemplateVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  templateId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  locale: string;

  @Column({ type: 'varchar', length: 500 })
  subject: string; // Handlebars-compatible, e.g. "Welcome {{firstName}}!"

  @Column({ type: 'text' })
  htmlBody: string; // Full HTML with Handlebars variables

  @Column({ type: 'text', nullable: true })
  textBody: string; // Plain-text fallback

  @Column({ type: 'text', nullable: true })
  preheader: string; // Preview text shown in inbox

  @Column({ type: 'jsonb', nullable: true })
  mjmlSource: string; // Raw MJML source if using MJML editor

  @Column({ type: 'varchar', length: 500, nullable: true })
  changeNotes: string;

  @Column({ type: 'boolean', default: false })
  isPublished: boolean; // true = this is the live version

  @Column({ type: 'uuid' })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;
}
