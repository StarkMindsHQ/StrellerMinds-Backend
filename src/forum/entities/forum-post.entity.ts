import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm"
import { ForumTopic } from "./forum-topic.entity"
import { ForumComment } from "./forum-comment.entity"
import { User } from "../../users/entities/user.entity"

@Entity("forum_posts")
export class ForumPost {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "text" })
  content: string

  @Column({ default: 0 })
  likes: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Many-to-One relationships
  @ManyToOne(
    () => User,
    (user) => user.forumPosts,
    { nullable: false },
  )
  @Index()
  author: Promise<User>

  @ManyToOne(
    () => ForumTopic,
    (topic) => topic.posts,
    { nullable: false, onDelete: "CASCADE" },
  )
  @Index()
  topic: Promise<ForumTopic>

  // One-to-Many relationship
  @OneToMany(
    () => ForumComment,
    (comment) => comment.post,
  )
  comments: Promise<ForumComment[]>
}

