import { ForumPost } from 'src/post/entities/forum-post.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { ForumCategory } from 'src/catogory/entities/forum-category.entity';

@Entity('forum_topics')
export class ForumTopic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ default: false })
  isClosed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ForumCategory, (category) => category.topics, {
    nullable: false,
    eager: true,
  })
  @JoinColumn({ name: 'categoryId' })
  @Index()
  category: ForumCategory;

  @ManyToOne(() => User, (user) => user.topics, {
    nullable: false,
    eager: true,
  })
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @OneToMany(() => ForumPost, (post) => post.topic)
  posts: ForumPost[];
}
