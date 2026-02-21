import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Skill } from './skill.entity';

@Entity('skill_assessments')
export class SkillAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Skill, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'skill_id' })
  skill: Skill;

  @Column({ type: 'uuid', name: 'skill_id' })
  skillId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int' })
  difficultyLevel: number; // 1-5

  @Column({ type: 'int' })
  estimatedDurationMinutes: number;

  @Column({ type: 'int' })
  totalQuestions: number;

  @Column({ type: 'int' })
  passingScore: number; // Percentage required to pass

  @Column({ type: 'simple-json' })
  questions: Array<{
    id: string;
    type: 'multiple_choice' | 'true_false' | 'coding' | 'text';
    question: string;
    options?: string[];
    correctAnswer: string | string[];
    points: number;
    explanation?: string;
  }>;

  @Column({ type: 'simple-json', nullable: true })
  tags: string[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  timesTaken: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  averageScore: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
