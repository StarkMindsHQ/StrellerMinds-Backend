import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ForumPost } from './forum-post.entity';

@Entity('post_votes')
@Unique(['user', 'post']) // User can only vote once per post
export class PostVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'boolean', default: true }) // true for upvote, false for downvote (optional)
  isUpvote: boolean; 

  @ManyToOne(() => User, user => user.id, { nullable: false, onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => ForumPost, post => post.votes, { nullable: false, onDelete: 'CASCADE' })
  post: ForumPost;
}
