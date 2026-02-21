import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { PortfolioItem } from './portfolio-item.entity';

@Entity('portfolio_media')
export class PortfolioMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PortfolioItem, (item) => item.media, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'portfolio_item_id' })
  portfolioItem: PortfolioItem;

  @Column({ type: 'uuid', name: 'portfolio_item_id' })
  portfolioItemId: string;

  @Column({ type: 'varchar', length: 50 })
  type: 'image' | 'video' | 'document' | 'audio' | 'link' | 'embed';

  @Column({ type: 'varchar', length: 255 })
  url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType: string;

  @Column({ type: 'int', nullable: true })
  fileSize: number; // in bytes

  @Column({ type: 'int', nullable: true })
  width: number; // For images/videos

  @Column({ type: 'int', nullable: true })
  height: number; // For images/videos

  @Column({ type: 'int', nullable: true })
  duration: number; // For videos/audio in seconds

  @Column({ type: 'varchar', length: 50, nullable: true })
  embedProvider: 'youtube' | 'vimeo' | 'figma' | 'codepen' | 'other'; // For embeds

  @Column({ type: 'text', nullable: true })
  embedCode: string; // For embeds

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'boolean', default: true })
  isPrimary: boolean; // Primary/main media for the item

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'simple-json', nullable: true })
  metadata: {
    altText?: string;
    caption?: string;
    tags?: string[];
    location?: string;
    captureDate?: Date;
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
