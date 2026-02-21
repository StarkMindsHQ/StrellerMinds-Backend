import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Assignment } from './assignment.entity';
import { Question } from './question.entity';

export enum AssessmentMode {
  PRACTICE = 'practice',
  EXAM = 'exam',
}

@Entity('assessments')
export class Assessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Assignment, (assignment) => assignment.id, { nullable: true })
  assignment?: Assignment;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description?: string;

  @OneToMany(() => Question, (q) => q.assessment, { cascade: true })
  questions: Question[];

  @Column({ type: 'enum', enum: AssessmentMode, default: AssessmentMode.EXAM })
  mode: AssessmentMode;

  @Column({ type: 'timestamp', nullable: true })
  availableFrom?: Date;

  @Column({ type: 'timestamp', nullable: true })
  availableTo?: Date;

  @Column({ default: 1 })
  timeLimitMinutes: number; // 0 = no limit

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
