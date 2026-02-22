import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { VideoVariant } from './video-variant.entity';
import { VideoAnalytics } from './video-analytics.entity';

export enum VideoStatus {
  PENDING = 'PENDING',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export enum VideoVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  UNLISTED = 'UNLISTED',
}

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  originalFileName: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ nullable: true })
  previewUrl: string;

  @Column({ default: 0 })
  duration: number; // in seconds

  @Column({ type: 'enum', enum: VideoStatus, default: VideoStatus.PENDING })
  status: VideoStatus;

  @Column({ type: 'enum', enum: VideoVisibility, default: VideoVisibility.PRIVATE })
  visibility: VideoVisibility;

  @Column({ nullable: true })
  uploaderId: string;

  @OneToMany(() => VideoVariant, (variant) => variant.video, { cascade: true })
  variants: VideoVariant[];

  @OneToMany(() => VideoAnalytics, (analytics) => analytics.video, { cascade: true })
  analytics: VideoAnalytics[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}