import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Attempt } from './attempt.entity';
import { Question } from './question.entity';

@Entity('attempt_answers')
export class AttemptAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Attempt, (attempt) => attempt.answers)
  attempt: Attempt;

  @ManyToOne(() => Question)
  question: Question;

  @Column('text', { nullable: true })
  answerText?: string;

  @Column('simple-array', { nullable: true })
  selectedOptionIds?: string[];

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score?: number;

  @Column({ nullable: true })
  feedback?: string;
}
