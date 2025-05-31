import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ForumComment } from './forum-comment.entity';

@Entity('comment_reactions')
@Unique(['user', 'comment', 'reactionType']) // User can only react once with a specific type per comment
export class CommentReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 }) // e.g., 'like', 'love', 'haha', etc.
  reactionType: string;

  @ManyToOne(() => User, user => user.id, { nullable: false, onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => ForumComment, comment => comment.reactions, { nullable: false, onDelete: 'CASCADE' })
  comment: ForumComment;
} 