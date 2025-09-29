// src/submission/entities/submission.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  studentId: string;

  @Column()
  assignmentId: string;

  @Column({ type: 'text', nullable: true })
  textContent: string;

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'submitted' | 'graded';

  @CreateDateColumn()
  submittedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'text', nullable: true })
  feedback: string;
}