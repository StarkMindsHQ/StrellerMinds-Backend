import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { UserProfile } from './user-profile.entity';

@Entity('portfolio_items')
export class PortfolioItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserProfile, (profile) => profile.portfolioItems, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_id' })
  profile: UserProfile;

  @Column({ type: 'uuid', name: 'profile_id' })
  profileId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  type: 'project' | 'certificate' | 'achievement' | 'publication' | 'course';

  @Column({ type: 'text', nullable: true })
  content: string; // HTML/Markdown content

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  projectUrl: string; // Link to live project

  @Column({ type: 'varchar', length: 255, nullable: true })
  repositoryUrl: string; // GitHub repo link

  @Column({ type: 'varchar', length: 255, nullable: true })
  certificateUrl: string; // Certificate or file link

  @Column({ type: 'jsonb', nullable: true, default: {} })
  technologies: string[]; // Tech stack

  @Column({ type: 'jsonb', nullable: true, default: {} })
  tags: string[];

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
