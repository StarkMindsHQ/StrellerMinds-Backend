import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { ObjectType, Field, ID } from "@nestjs/graphql"

import { User } from "../../user/entities/user.entity"

export enum PostStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  ARCHIVED = "archived",
}

@Entity("posts")
@ObjectType()
export class Post {
  @PrimaryGeneratedColumn("uuid")
  @Field(() => ID)
  id: string

  @Column()
  @Field()
  title: string

  @Column("text")
  @Field()
  content: string

  @Column({ nullable: true })
  @Field({ nullable: true })
  excerpt?: string

  @Column({
    type: "enum",
    enum: PostStatus,
    default: PostStatus.DRAFT,
  })
  @Field(() => String)
  status: PostStatus

  @Column("simple-array", { nullable: true })
  @Field(() => [String], { nullable: true })
  tags?: string[]

  @Column({ nullable: true })
  @Field({ nullable: true })
  featuredImage?: string

  @Column({ default: 0 })
  @Field()
  viewCount: number

  @Column({ default: 0 })
  @Field()
  likeCount: number

  @ManyToOne(
    () => User,
    (user) => user.posts,
  )
  @Field(() => User)
  author: User

  @Column()
  authorId: string

  @CreateDateColumn()
  @Field()
  createdAt: Date

  @UpdateDateColumn()
  @Field()
  updatedAt: Date

  @Field({ nullable: true })
  publishedAt?: Date
}
