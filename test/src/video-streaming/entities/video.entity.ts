import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Lesson } from '../../lesson/entity/lesson.entity';
import { VideoQuality } from './video-quality.entity';
import { VideoAnalytics } from './video-analytics.entity';

export enum VideoStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
  ARCHIVED = 'archived',
}

export enum VideoVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  UNLISTED = 'unlisted',
  COURSE_ONLY = 'course_only',
}

export enum VideoFormat {
  MP4 = 'mp4',
  WEBM = 'webm',
  HLS = 'hls',
  DASH = 'dash',
}

@Entity('videos')
@Index(['status'])
@Index(['visibility'])
@Index(['uploadedBy'])
@Index(['createdAt'])
export class Video {
  @ApiProperty({ description: 'Video ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Video title' })
  @Column({ length: 255 })
  title: string;

  @ApiProperty({ description: 'Video description' })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({ description: 'Original filename' })
  @Column({ length: 255 })
  originalFilename: string;

  @ApiProperty({ description: 'Video status', enum: VideoStatus })
  @Column({
    type: 'enum',
    enum: VideoStatus,
    default: VideoStatus.UPLOADING,
  })
  status: VideoStatus;

  @ApiProperty({ description: 'Video visibility', enum: VideoVisibility })
  @Column({
    type: 'enum',
    enum: VideoVisibility,
    default: VideoVisibility.PRIVATE,
  })
  visibility: VideoVisibility;

  @ApiProperty({ description: 'Video duration in seconds' })
  @Column({ type: 'int', default: 0 })
  duration: number;

  @ApiProperty({ description: 'Video file size in bytes' })
  @Column({ type: 'bigint', default: 0 })
  fileSize: number;

  @ApiProperty({ description: 'Video width in pixels' })
  @Column({ type: 'int', nullable: true })
  width: number;

  @ApiProperty({ description: 'Video height in pixels' })
  @Column({ type: 'int', nullable: true })
  height: number;

  @ApiProperty({ description: 'Video frame rate' })
  @Column({ type: 'float', nullable: true })
  frameRate: number;

  @ApiProperty({ description: 'Video bitrate in kbps' })
  @Column({ type: 'int', nullable: true })
  bitrate: number;

  @ApiProperty({ description: 'Video codec' })
  @Column({ length: 50, nullable: true })
  codec: string;

  @ApiProperty({ description: 'Audio codec' })
  @Column({ length: 50, nullable: true })
  audioCodec: string;

  @ApiProperty({ description: 'Primary streaming URL' })
  @Column({ type: 'text', nullable: true })
  streamingUrl: string;

  @ApiProperty({ description: 'HLS manifest URL' })
  @Column({ type: 'text', nullable: true })
  hlsUrl: string;

  @ApiProperty({ description: 'DASH manifest URL' })
  @Column({ type: 'text', nullable: true })
  dashUrl: string;

  @ApiProperty({ description: 'Thumbnail URL' })
  @Column({ type: 'text', nullable: true })
  thumbnailUrl: string;

  @ApiProperty({ description: 'Preview GIF URL' })
  @Column({ type: 'text', nullable: true })
  previewUrl: string;

  @ApiProperty({ description: 'CloudFront distribution domain' })
  @Column({ length: 255, nullable: true })
  cdnDomain: string;

  @ApiProperty({ description: 'S3 bucket name' })
  @Column({ length: 255, nullable: true })
  s3Bucket: string;

  @ApiProperty({ description: 'S3 object key' })
  @Column({ length: 500, nullable: true })
  s3Key: string;

  @ApiProperty({ description: 'Video metadata' })
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    originalFormat?: string;
    uploadMethod?: 'direct' | 'chunked' | 'resumable';
    processingStartedAt?: Date;
    processingCompletedAt?: Date;
    processingErrors?: string[];
    qualityVariants?: string[];
    subtitles?: Array<{
      language: string;
      url: string;
      format: string;
    }>;
    chapters?: Array<{
      title: string;
      startTime: number;
      endTime: number;
    }>;
    tags?: string[];
    customData?: Record<string, any>;
  };

  @ApiProperty({ description: 'Security settings' })
  @Column({ type: 'jsonb', nullable: true })
  securitySettings: {
    requireAuth?: boolean;
    allowedDomains?: string[];
    geoRestrictions?: {
      allowedCountries?: string[];
      blockedCountries?: string[];
    };
    drmEnabled?: boolean;
    drmProvider?: string;
    signedUrlExpiry?: number;
    downloadEnabled?: boolean;
    embedEnabled?: boolean;
  };

  @ApiProperty({ description: 'Processing settings' })
  @Column({ type: 'jsonb', nullable: true })
  processingSettings: {
    generateThumbnails?: boolean;
    thumbnailCount?: number;
    generatePreview?: boolean;
    adaptiveStreaming?: boolean;
    qualityLevels?: string[];
    watermark?: {
      enabled: boolean;
      url?: string;
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
      opacity?: number;
    };
  };

  @ApiProperty({ description: 'View count' })
  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @ApiProperty({ description: 'Like count' })
  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @ApiProperty({ description: 'Share count' })
  @Column({ type: 'int', default: 0 })
  shareCount: number;

  @ApiProperty({ description: 'Average rating' })
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @ApiProperty({ description: 'Total rating count' })
  @Column({ type: 'int', default: 0 })
  ratingCount: number;

  @ApiProperty({ description: 'User who uploaded the video' })
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @ApiProperty({ description: 'Associated lesson' })
  @ManyToOne(() => Lesson, (lesson) => lesson.videoUrl, { nullable: true })
  lesson: Lesson;

  @ApiProperty({ description: 'Video quality variants' })
  @OneToMany(() => VideoQuality, (quality) => quality.video, { cascade: true })
  qualityVariants: VideoQuality[];

  @ApiProperty({ description: 'Video analytics' })
  @OneToMany(() => VideoAnalytics, (analytics) => analytics.video, { cascade: true })
  analytics: VideoAnalytics[];

  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get isProcessed(): boolean {
    return this.status === VideoStatus.READY;
  }

  get hasAdaptiveStreaming(): boolean {
    return !!(this.hlsUrl || this.dashUrl);
  }

  get aspectRatio(): number | null {
    if (this.width && this.height) {
      return this.width / this.height;
    }
    return null;
  }

  get formattedDuration(): string {
    if (!this.duration) return '0:00';
    
    const hours = Math.floor(this.duration / 3600);
    const minutes = Math.floor((this.duration % 3600) / 60);
    const seconds = this.duration % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  get formattedFileSize(): string {
    if (!this.fileSize) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = Number(this.fileSize);
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}
