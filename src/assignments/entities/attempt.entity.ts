import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Assessment } from './assessment.entity';
import { User } from '../../auth/entities/user.entity';
import { AttemptAnswer } from './attempt-answer.entity';

@Entity('attempts')
export class Attempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Assessment)
  assessment: Assessment;

  @ManyToOne(() => User)
  student: User;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ default: 0 })
  score: number;

  @Column({ default: false })
  submitted: boolean;

  @OneToMany(() => AttemptAnswer, (a) => a.attempt, { cascade: true })
  answers: AttemptAnswer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
