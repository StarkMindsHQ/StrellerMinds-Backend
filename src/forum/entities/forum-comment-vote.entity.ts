import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ForumComment } from './forum-comment.entity';

@Entity('comment_votes')
@Unique(['user', 'comment']) // User can only vote once per comment
export class CommentVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'boolean', default: true }) // true for upvote, false for downvote
  isUpvote: boolean;

  @ManyToOne(() => User, user => user.id, { nullable: false, onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => ForumComment, comment => comment.votes, { nullable: false, onDelete: 'CASCADE' })
  comment: ForumComment;
} 