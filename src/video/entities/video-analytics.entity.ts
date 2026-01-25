import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Video } from './video.entity';

@Entity('video_analytics')
export class VideoAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  videoId: string;

  @ManyToOne(() => Video, (video) => video.analytics, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'videoId' })
  video: Video;

  @Column()
  userId: string; // Keeping it loosely coupled for now or can relate to User entity if User module is accessible

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  watchTime: number; // Time watched in seconds

  @Column({ default: false })
  completed: boolean;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  lastPosition: number; // Last playback position

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
