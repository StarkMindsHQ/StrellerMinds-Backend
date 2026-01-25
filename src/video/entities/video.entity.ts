import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Chapter } from './chapter.entity';
import { Quiz } from './quiz.entity';
import { VideoAnalytics } from './video-analytics.entity';

export enum VideoStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  originalFileId: string; // Reference to the original raw video in Files module

  @Column({ nullable: true })
  hlsManifestPath: string; // Path to .m3u8 file

  @Column({ nullable: true })
  thumbnailPath: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  duration: number; // Duration in seconds

  @Column({
    type: 'enum',
    enum: VideoStatus,
    default: VideoStatus.PENDING,
  })
  status: VideoStatus;

  @Column()
  ownerId: string;

  @Column({ default: 0 })
  views: number;

  @OneToMany(() => Chapter, (chapter) => chapter.video)
  chapters: Chapter[];

  @OneToMany(() => Quiz, (quiz) => quiz.video)
  quizzes: Quiz[];

  @OneToMany(() => VideoAnalytics, (analytics) => analytics.video)
  analytics: VideoAnalytics[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
