/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Topic } from 'src/topic/topic.entity';
import { User } from '../users/entities/user.entity';
import { Reply } from 'src/reply/reply.entity';

/**
 * Entity representing a discussion thread within a topic.
 */
@Entity('threads')
export class Thread {
  /** Unique thread ID */
  @ApiProperty({ description: 'Unique thread ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  /** Topic to which this thread belongs */
  @ApiProperty({ description: 'Topic to which this thread belongs', type: () => Topic })
  @ManyToOne(() => Topic, (topic) => topic.threads)
  topic: Topic;

  /** Author of the thread */
  @ApiProperty({ description: 'Author of the thread', type: () => User })
  @ManyToOne(() => User)
  author: User;

  /** Title of the thread */
  @ApiProperty({ description: 'Title of the thread', example: 'How to use OpenAPI with NestJS?' })
  @Column()
  title: string;

  /** Content of the thread */
  @ApiProperty({ description: 'Content of the thread', example: 'Can someone explain how to document APIs with Swagger in NestJS?' })
  @Column('text')
  content: string;

  /** Whether the thread is open for replies */
  @ApiProperty({ description: 'Whether the thread is open for replies', example: true })
  @Column({ default: true })
  isOpen: boolean;

  /** Date/time when the thread was created */
  @ApiProperty({ description: 'Date/time when the thread was created', type: String, format: 'date-time', example: '2025-06-29T12:00:00Z' })
  @CreateDateColumn()
  createdAt: Date;

  /** Replies to this thread */
  @ApiProperty({ description: 'Replies to this thread', type: () => [Reply] })
  @OneToMany(() => Reply, (reply: Reply) => reply.thread)
  replies: Reply[];
}
