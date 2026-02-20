import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Thread } from './thread.entity';

@Entity()
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Thread, (thread) => thread.comments)
  thread: Thread;

  @Column({ nullable: true })
  parentId: string;

  @Column('text')
  contentMarkdown: string;

  @Column()
  authorId: string;

  @Column()
  path: string; // e.g 1.3.5

  @CreateDateColumn()
  createdAt: Date;
}
