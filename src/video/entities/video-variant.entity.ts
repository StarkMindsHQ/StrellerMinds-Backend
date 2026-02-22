import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Video } from './video.entity';

@Entity('video_variants')
export class VideoVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Video, (video) => video.variants, { onDelete: 'CASCADE' })
  video: Video;

  @Column()
  resolution: string; // e.g., '1080p', '720p', '480p'

  @Column()
  bitrate: number; // in kbps

  @Column()
  format: string; // 'hls', 'mp4', 'dash'

  @Column()
  url: string;

  @Column({ nullable: true })
  size: number; // in bytes

  @CreateDateColumn()
  createdAt: Date;
}