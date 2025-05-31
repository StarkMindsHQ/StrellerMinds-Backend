import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ForumPost } from '../../post/entities/forum-post.entity';
import { User } from '../../users/entities/user.entity';
import { CommentVote } from './forum-comment-vote.entity';
import { CommentReaction } from './forum-comment-reaction.entity';

@Entity('forum_comments')
@Index('comment_content_index', ['content'], { fulltext: true })
export class ForumComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: 0 })
  likes: number;

  @Column({ default: 0 })
  voteScore: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;

  // Many-to-One relationships
  @ManyToOne(() => User, (user) => user.id, { nullable: false, eager: true })
  @Index()
  author: User;

  @ManyToOne(() => ForumPost, (post) => post.comments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @Index()
  post: ForumPost;

  @OneToMany(() => CommentVote, (vote) => vote.comment)
  votes: CommentVote[];

  @OneToMany(() => CommentReaction, (reaction) => reaction.comment)
  reactions: CommentReaction[];
}
