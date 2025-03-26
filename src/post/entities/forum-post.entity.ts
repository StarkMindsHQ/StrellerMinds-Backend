import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ForumTopic } from '../../topic/entities/forum-topic.entity';
import { ForumComment } from '../../forum/entities/forum-comment.entity';
import { User } from '../../users/entities/user.entity';
import { PostVote } from './forum-post-vote.entity';
import { PostReaction } from './forum-post-reaction.entity';

@Entity('forum_posts')
@Index('content_index', ['content'], { fulltext: true })
export class ForumPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: 0 })
  likes: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Many-to-One relationships
  @ManyToOne(() => User, (user) => user.forumPosts, { nullable: false })
  @Index()
  author: User; // Remove Promise, use the entity directly

  @ManyToOne(() => ForumTopic, (topic) => topic.posts, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @Index()
  topic: ForumTopic; // Remove Promise, use the entity directly

  // One-to-Many relationship for comments
  @OneToMany(() => ForumComment, (comment) => comment.post)
  comments: ForumComment[];

  // One-to-Many relationship for votes
  @OneToMany(() => PostVote, (vote) => vote.post)
  votes: PostVote[];

  @OneToMany(() => PostReaction, (reaction) => reaction.post)
  reactions: PostReaction[];
}
