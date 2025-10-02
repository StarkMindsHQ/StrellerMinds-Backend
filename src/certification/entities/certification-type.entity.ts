import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Certificate } from './certificate.entity';

export enum CertificationCategory {
  COURSE_COMPLETION = 'course_completion',
  SKILL_ASSESSMENT = 'skill_assessment',
  PROFESSIONAL = 'professional',
  ACHIEVEMENT = 'achievement',
  CUSTOM = 'custom',
}

export enum CertificationLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

@Entity('certification_types')
export class CertificationType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: CertificationCategory,
    default: CertificationCategory.COURSE_COMPLETION,
  })
  category: CertificationCategory;

  @Column({
    type: 'enum',
    enum: CertificationLevel,
    default: CertificationLevel.BEGINNER,
  })
  level: CertificationLevel;

  @Column({ type: 'json', nullable: true })
  requirements: {
    minScore?: number;
    requiredCourses?: string[];
    prerequisites?: string[];
    validityPeriod?: number; // in days
    renewalRequired?: boolean;
  };

  @Column({ type: 'json', nullable: true })
  template: {
    backgroundColor?: string;
    textColor?: string;
    logoUrl?: string;
    layout?: string;
    customFields?: Record<string, any>;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  validityDays: number; // 0 = never expires

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @OneToMany(() => Certificate, (certificate) => certificate.certificationType)
  certificates: Certificate[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
