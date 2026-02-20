import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ObjectiveType {
  KNOWLEDGE = 'knowledge',
  SKILL = 'skill',
  COMPETENCY = 'competency',
  CERTIFICATION = 'certification',
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

@Entity('learning_objectives')
@Index(['type'])
@Index(['domain'])
export class LearningObjective {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: ObjectiveType })
  type: ObjectiveType;

  @Column({ type: 'enum', enum: DifficultyLevel })
  difficulty: DifficultyLevel;

  @Column()
  domain: string; // Subject area or competency domain

  @Column({ nullable: true })
  bloomTaxonomyLevel: string; // Remember, Understand, Apply, Analyze, Evaluate, Create

  @Column({ type: 'simple-json', default: [] })
  keywords: string[]; // For search and categorization

  @Column({ type: 'simple-json', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
