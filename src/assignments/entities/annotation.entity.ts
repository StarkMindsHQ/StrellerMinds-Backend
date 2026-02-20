import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Submission } from './submission.entity';
import { User } from '../../auth/entities/user.entity';

export enum AnnotationType {
  COMMENT = 'comment',
  HIGHLIGHT = 'highlight',
  CORRECTION = 'correction',
  SUGGESTION = 'suggestion',
}

@Entity('annotations')
export class Annotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Submission, (submission) => submission.annotations)
  submission: Submission;

  @ManyToOne(() => User)
  createdBy: User;

  @Column({ type: 'enum', enum: AnnotationType })
  type: AnnotationType;

  @Column('text')
  content: string;

  @Column('simple-json')
  position: {
    page?: number;
    lineNumber?: number;
    startChar?: number;
    endChar?: number;
    x?: number;
    y?: number;
  };

  @Column({ nullable: true })
  color?: string;

  @CreateDateColumn()
  createdAt: Date;
}
