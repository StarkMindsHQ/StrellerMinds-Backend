import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ContentFormat } from '../enums/content-format.enum';
import { CourseContent } from './course-content.entity';

@Entity('content_templates')
@Index(['format', 'isGlobal'])
export class ContentTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ContentFormat })
  format: ContentFormat;

  @Column({ type: 'json' })
  blueprint: Record<string, any>;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ default: false })
  isGlobal: boolean;

  @Column({ nullable: true })
  createdBy: string;

  @OneToMany(() => CourseContent, (content) => content.template)
  contents: CourseContent[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
