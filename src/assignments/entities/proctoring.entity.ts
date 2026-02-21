import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Attempt } from './attempt.entity';

@Entity('proctoring_sessions')
export class ProctoringSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Attempt)
  attempt: Attempt;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  // JSON array of events: [{type: 'focus_lost', timestamp, details}] 
  @Column('simple-json', { nullable: true })
  events?: any[];

  @Column({ default: false })
  flagged: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
