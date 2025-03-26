import { User } from 'src/users/entities/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ForumPost } from './forum-post.entity';

@Entity('post_reactions')
export class PostReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string; // e.g., 'like', 'dislike'

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => ForumPost, (post) => post.reactions)
  post: ForumPost;
}
