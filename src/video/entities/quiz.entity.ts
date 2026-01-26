import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Video } from './video.entity';

@Entity('video_quizzes')
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  videoId: string;

  @ManyToOne(() => Video, (video) => video.quizzes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'videoId' })
  video: Video;

  @Column()
  question: string;

  @Column('jsonb')
  options: string[]; // List of options

  @Column()
  correctAnswer: string; // The correct option exactly matching one of the options

  @Column('decimal', { precision: 10, scale: 2 })
  timestamp: number; // Where it appears in the video
}
