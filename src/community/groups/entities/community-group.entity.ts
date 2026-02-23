import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../../auth/entities/user.entity';

export enum GroupType {
  STUDY = 'study',
  COHORT = 'cohort',
  PROJECT = 'project',
  INTEREST = 'interest',
  SUPPORT = 'support',
}

export enum GroupPrivacy {
  PUBLIC = 'public',
  PRIVATE = 'private',
  SECRET = 'secret',
}

@Entity('community_groups')
@Index(['type', 'privacy'])
export class CommunityGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: GroupType })
  type: GroupType;

  @Column({ type: 'enum', enum: GroupPrivacy, default: GroupPrivacy.PUBLIC })
  privacy: GroupPrivacy;

  @Column({ name: 'creator_id' })
  creatorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column({ type: 'varchar', length: 255, nullable: true })
  coverImage: string;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ type: 'int', default: 0 })
  memberCount: number;

  @Column({ type: 'int', nullable: true })
  maxMembers: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  rules: string[];

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    allowMemberInvites: boolean;
    requireApproval: boolean;
    allowDiscussions: boolean;
    allowEvents: boolean;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
