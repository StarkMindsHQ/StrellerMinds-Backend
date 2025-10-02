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
import { User } from '../../users/entities/user.entity';

export enum AnalyticsEventType {
  VIEW_START = 'view_start',
  VIEW_END = 'view_end',
  PAUSE = 'pause',
  RESUME = 'resume',
  SEEK = 'seek',
  QUALITY_CHANGE = 'quality_change',
  FULLSCREEN_ENTER = 'fullscreen_enter',
  FULLSCREEN_EXIT = 'fullscreen_exit',
  VOLUME_CHANGE = 'volume_change',
  PLAYBACK_RATE_CHANGE = 'playback_rate_change',
  BUFFER_START = 'buffer_start',
  BUFFER_END = 'buffer_end',
  ERROR = 'error',
}

@Entity('video_analytics')
@Index(['video', 'user'])
@Index(['eventType'])
@Index(['timestamp'])
@Index(['sessionId'])
export class VideoAnalytics {
  @ApiProperty({ description: 'Analytics event ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Session ID for grouping events' })
  @Column({ length: 255 })
  sessionId: string;

  @ApiProperty({ description: 'Event type', enum: AnalyticsEventType })
  @Column({
    type: 'enum',
    enum: AnalyticsEventType,
  })
  eventType: AnalyticsEventType;

  @ApiProperty({ description: 'Timestamp when event occurred' })
  @Column({ type: 'timestamp with time zone' })
  timestamp: Date;

  @ApiProperty({ description: 'Video playback position in seconds' })
  @Column({ type: 'float', nullable: true })
  playbackPosition: number;

  @ApiProperty({ description: 'Video quality at time of event' })
  @Column({ length: 50, nullable: true })
  quality: string;

  @ApiProperty({ description: 'Playback rate (1.0 = normal speed)' })
  @Column({ type: 'float', default: 1.0 })
  playbackRate: number;

  @ApiProperty({ description: 'Volume level (0.0 to 1.0)' })
  @Column({ type: 'float', nullable: true })
  volume: number;

  @ApiProperty({ description: 'Whether video is in fullscreen' })
  @Column({ default: false })
  isFullscreen: boolean;

  @ApiProperty({ description: 'Buffer health percentage' })
  @Column({ type: 'float', nullable: true })
  bufferHealth: number;

  @ApiProperty({ description: 'Network bandwidth in kbps' })
  @Column({ type: 'int', nullable: true })
  bandwidth: number;

  @ApiProperty({ description: 'User agent string' })
  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @ApiProperty({ description: 'IP address' })
  @Column({ length: 45, nullable: true })
  ipAddress: string;

  @ApiProperty({ description: 'Geographic location' })
  @Column({ type: 'jsonb', nullable: true })
  geolocation: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  };

  @ApiProperty({ description: 'Device information' })
  @Column({ type: 'jsonb', nullable: true })
  deviceInfo: {
    type?: 'desktop' | 'mobile' | 'tablet' | 'tv' | 'unknown';
    os?: string;
    osVersion?: string;
    browser?: string;
    browserVersion?: string;
    screenResolution?: string;
    devicePixelRatio?: number;
  };

  @ApiProperty({ description: 'Player information' })
  @Column({ type: 'jsonb', nullable: true })
  playerInfo: {
    version?: string;
    type?: 'html5' | 'flash' | 'native';
    features?: string[];
    plugins?: string[];
  };

  @ApiProperty({ description: 'Network information' })
  @Column({ type: 'jsonb', nullable: true })
  networkInfo: {
    connectionType?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };

  @ApiProperty({ description: 'Performance metrics' })
  @Column({ type: 'jsonb', nullable: true })
  performanceMetrics: {
    loadTime?: number;
    firstFrame?: number;
    bufferEvents?: number;
    qualityChanges?: number;
    errors?: number;
    averageBitrate?: number;
    droppedFrames?: number;
  };

  @ApiProperty({ description: 'Event-specific data' })
  @Column({ type: 'jsonb', nullable: true })
  eventData: {
    seekFrom?: number;
    seekTo?: number;
    previousQuality?: string;
    newQuality?: string;
    errorCode?: string;
    errorMessage?: string;
    bufferDuration?: number;
    [key: string]: any;
  };

  @ApiProperty({ description: 'Referrer URL' })
  @Column({ type: 'text', nullable: true })
  referrer: string;

  @ApiProperty({ description: 'Page URL where video is being watched' })
  @Column({ type: 'text', nullable: true })
  pageUrl: string;

  @ApiProperty({ description: 'Video being watched' })
  @ManyToOne(() => Video, (video) => video.analytics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'video_id' })
  video: Video;

  @ApiProperty({ description: 'User watching the video' })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get isEngagementEvent(): boolean {
    return [
      AnalyticsEventType.VIEW_START,
      AnalyticsEventType.PAUSE,
      AnalyticsEventType.RESUME,
      AnalyticsEventType.SEEK,
      AnalyticsEventType.FULLSCREEN_ENTER,
    ].includes(this.eventType);
  }

  get isQualityEvent(): boolean {
    return this.eventType === AnalyticsEventType.QUALITY_CHANGE;
  }

  get isPerformanceEvent(): boolean {
    return [
      AnalyticsEventType.BUFFER_START,
      AnalyticsEventType.BUFFER_END,
      AnalyticsEventType.ERROR,
    ].includes(this.eventType);
  }

  get formattedTimestamp(): string {
    return this.timestamp.toISOString();
  }

  get playbackPositionFormatted(): string {
    if (!this.playbackPosition) return '0:00';

    const minutes = Math.floor(this.playbackPosition / 60);
    const seconds = Math.floor(this.playbackPosition % 60);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
