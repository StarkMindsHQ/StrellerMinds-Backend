import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Video } from './video.entity';

@Entity('video_chapters')
export class Chapter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  videoId: string;

  @ManyToOne(() => Video, (video) => video.chapters, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'videoId' })
  video: Video;

  @Column()
  title: string;

  @Column('decimal', { precision: 10, scale: 2 })
  startTime: number; // In seconds

  @Column('decimal', { precision: 10, scale: 2 })
  endTime: number; // In seconds
}
