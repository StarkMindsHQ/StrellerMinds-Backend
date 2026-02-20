import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TemplateCategory {
  FOUNDATION = 'foundation',
  SPECIALIZATION = 'specialization',
  CERTIFICATION = 'certification',
  BOOTCAMP = 'bootcamp',
  DEGREE_PREP = 'degree_prep',
  SKILL_PATH = 'skill_path',
}

@Entity('learning_path_templates')
@Index(['category'])
@Index(['isPublic'])
export class LearningPathTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: TemplateCategory })
  category: TemplateCategory;

  @Column({ default: false })
  @Index()
  isPublic: boolean;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string; // Instructor who created the template

  @Column({ type: 'simple-json', default: {} })
  structure: Record<string, any>; // Template structure definition

  @Column({ type: 'simple-json', default: [] })
  tags: string[];

  @Column({ default: 0 })
  usageCount: number; // How many times this template has been used

  @Column({ default: 0 })
  estimatedDurationHours: number;

  @Column({ type: 'simple-json', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
