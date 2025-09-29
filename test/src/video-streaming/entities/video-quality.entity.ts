import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Video } from './video.entity';

export enum QualityLevel {
  AUDIO_ONLY = 'audio_only',
  LOW = '240p',
  MEDIUM = '360p',
  STANDARD = '480p',
  HIGH = '720p',
  FULL_HD = '1080p',
  QUAD_HD = '1440p',
  ULTRA_HD = '2160p',
}

export enum VideoContainer {
  MP4 = 'mp4',
  WEBM = 'webm',
  MKV = 'mkv',
  AVI = 'avi',
  MOV = 'mov',
}

@Entity('video_qualities')
@Index(['video', 'quality'])
@Index(['status'])
export class VideoQuality {
  @ApiProperty({ description: 'Quality variant ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Quality level', enum: QualityLevel })
  @Column({
    type: 'enum',
    enum: QualityLevel,
  })
  quality: QualityLevel;

  @ApiProperty({ description: 'Video width in pixels' })
  @Column({ type: 'int' })
  width: number;

  @ApiProperty({ description: 'Video height in pixels' })
  @Column({ type: 'int' })
  height: number;

  @ApiProperty({ description: 'Video bitrate in kbps' })
  @Column({ type: 'int' })
  bitrate: number;

  @ApiProperty({ description: 'Audio bitrate in kbps' })
  @Column({ type: 'int', nullable: true })
  audioBitrate: number;

  @ApiProperty({ description: 'Frame rate' })
  @Column({ type: 'float' })
  frameRate: number;

  @ApiProperty({ description: 'Video codec' })
  @Column({ length: 50 })
  codec: string;

  @ApiProperty({ description: 'Audio codec' })
  @Column({ length: 50, nullable: true })
  audioCodec: string;

  @ApiProperty({ description: 'Container format', enum: VideoContainer })
  @Column({
    type: 'enum',
    enum: VideoContainer,
    default: VideoContainer.MP4,
  })
  container: VideoContainer;

  @ApiProperty({ description: 'File size in bytes' })
  @Column({ type: 'bigint' })
  fileSize: number;

  @ApiProperty({ description: 'Direct URL to the video file' })
  @Column({ type: 'text' })
  url: string;

  @ApiProperty({ description: 'S3 object key' })
  @Column({ length: 500 })
  s3Key: string;

  @ApiProperty({ description: 'Processing status' })
  @Column({ 
    type: 'enum',
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @ApiProperty({ description: 'Processing progress percentage' })
  @Column({ type: 'int', default: 0 })
  processingProgress: number;

  @ApiProperty({ description: 'Processing error message' })
  @Column({ type: 'text', nullable: true })
  processingError: string;

  @ApiProperty({ description: 'Quality-specific metadata' })
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    profile?: string;
    level?: string;
    pixelFormat?: string;
    colorSpace?: string;
    chromaSubsampling?: string;
    bitDepth?: number;
    hdr?: boolean;
    processingTime?: number;
    compressionRatio?: number;
    qualityScore?: number;
  };

  @ApiProperty({ description: 'Parent video' })
  @ManyToOne(() => Video, (video) => video.qualityVariants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'video_id' })
  video: Video;

  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get aspectRatio(): number {
    return this.width / this.height;
  }

  get isHD(): boolean {
    return this.height >= 720;
  }

  get isFullHD(): boolean {
    return this.height >= 1080;
  }

  get is4K(): boolean {
    return this.height >= 2160;
  }

  get formattedFileSize(): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = Number(this.fileSize);
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  get qualityLabel(): string {
    if (this.quality === QualityLevel.AUDIO_ONLY) {
      return 'Audio Only';
    }
    return `${this.quality} (${this.bitrate}k)`;
  }

  get resolution(): string {
    return `${this.width}x${this.height}`;
  }
}
