import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { CourseContent } from './course-content.entity';
import { CollaborationRole } from '../enums/collaboration-role.enum';

@Entity('content_collaborations')
@Index(['contentId', 'userId'], { unique: true })
export class ContentCollaboration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  contentId: string;

  @ManyToOne(() => CourseContent, (content) => content.collaborators, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentId' })
  content: CourseContent;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: CollaborationRole, default: CollaborationRole.EDITOR })
  role: CollaborationRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastEditedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
