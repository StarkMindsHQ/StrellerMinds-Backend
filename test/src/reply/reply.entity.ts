/* eslint-disable prettier/prettier */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Thread } from 'src/thread/thread.entity';
import { User } from '../users/entities/user.entity';

@Entity('replies')
export class Reply {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Thread, (thread) => thread.replies)
  thread: Thread;

  @ManyToOne(() => User)
  author: User;

  @Column('text')
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  isReported: boolean;
}
