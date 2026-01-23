import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany
} from 'typeorm';
import { Comment } from './comment.entity';

@Entity()
export class Thread {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  contentMarkdown: string;

  @Column()
  authorId: string;

  @Column({ default: false })
  isLocked: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @OneToMany(() => Comment, comment => comment.thread)
  comments: Comment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
