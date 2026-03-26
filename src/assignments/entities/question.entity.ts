import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Assessment } from './assessment.entity';
import { Option } from './option.entity';

export enum QuestionType {
  MULTIPLE_CHOICE = 'mcq',
  ESSAY = 'essay',
  CODING = 'coding',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Assessment, (a) => a.questions)
  assessment: Assessment;

  @Column()
  title: string;

  @Column('text')
  prompt: string;

  @Column({ type: 'enum', enum: QuestionType })
  type: QuestionType;

  @OneToMany(() => Option, (o) => o.question, { cascade: true })
  options: Option[];

  @Column({ nullable: true })
  maxPoints?: number;

  // For coding questions store basic testcases as JSON [{input, expectedOutput, points}]
  @Column('simple-json', { nullable: true })
  testCases?: Array<{ input: string; expectedOutput: string; points?: number }>;
}
