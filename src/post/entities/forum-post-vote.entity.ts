import { User } from 'src/users/entities/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ForumPost } from './forum-post.entity';

@Entity()
export class PostVote {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ForumPost, (post) => post.votes, { nullable: false })
  post: ForumPost;

  @ManyToOne(() => User, (user) => user.votes, { nullable: false })
  user: User;

  @Column()
  value: number; // 1 for upvote, -1 for downvote
}
