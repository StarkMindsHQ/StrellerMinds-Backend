import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ForumPost } from './forum-post.entity';

@Entity('post_reactions')
@Unique(['user', 'post', 'reactionType']) // User can only react once with a specific type per post
export class PostReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 }) // e.g., 'like', 'love', 'haha', 'wow', 'sad', 'angry'
  reactionType: string;

  @ManyToOne(() => User, user => user.id, { nullable: false, onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => ForumPost, post => post.reactions, { nullable: false, onDelete: 'CASCADE' })
  post: ForumPost;
}
