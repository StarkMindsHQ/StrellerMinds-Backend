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
import { Course } from '../../courses/entities/course.entity';

@Entity('forum_topics')
@Index('title_index', ['title'], { fulltext: true })
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

  @ManyToOne(() => Course, course => course.forumTopics, { nullable: true })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ type: 'uuid', nullable: true })
  courseId: string;

  @ManyToOne(() => ForumCategory, (category) => category.topics, {
    nullable: false,
    eager: true,
  })
  @JoinColumn({ name: 'categoryId' })
  @Index()
  category: ForumCategory;

  @ManyToOne(() => User, (user) => user.id, {
    nullable: false,
    eager: true,
  })
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @OneToMany(() => ForumPost, (post) => post.topic)
  posts: ForumPost[];
}
