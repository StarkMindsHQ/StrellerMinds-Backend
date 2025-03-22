import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { ForumTopic } from "./forum-topic.entity"

@Entity("forum_categories")
export class ForumCategory {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ length: 100 })
  name: string

  @Column({ type: "text", nullable: true })
  description: string

  @Column({ default: 0 })
  order: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // One-to-Many relationship
  @OneToMany(
    () => ForumTopic,
    (topic) => topic.category,
  )
  topics: Promise<ForumTopic[]>
}

