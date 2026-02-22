import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, UpdateDateColumn } from 'typeorm';
import { Video } from './video.entity';

@Entity('video_analytics')
export class VideoAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Video, (video) => video.analytics, { onDelete: 'CASCADE' })
  video: Video;

  @Column({ default: 0 })
  views: number;

  @Column({ default: 0 })
  uniqueViewers: number;

  @Column({ type: 'float', default: 0 })
  averageWatchTime: number; // in seconds

  @Column({ type: 'float', default: 0 })
  completionRate: number; // percentage 0-100

  @Column({ type: 'jsonb', nullable: true })
  engagementGraph: any; // Time-based retention data points

  @UpdateDateColumn()
  lastUpdated: Date;
}