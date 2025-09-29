/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Thread } from 'src/thread/thread.entity';

/**
 * Entity representing a discussion topic.
 */
@Entity('topics')
export class Topic {
  /** Unique topic ID */
  @ApiProperty({ description: 'Unique topic ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  /** Name of the topic */
  @ApiProperty({ description: 'Name of the topic', example: 'API Documentation' })
  @Column()
  name: string;

  /** Threads under this topic */
  @ApiProperty({ description: 'Threads under this topic', type: () => [Thread] })
  @OneToMany(() => Thread, (thread) => thread.topic)
  threads: Thread[];
}
