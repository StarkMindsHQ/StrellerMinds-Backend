import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { ObjectType, Field, ID } from "@nestjs/graphql"

import { Post } from "../../post/entities/post.entity"

@Entity("users")
@ObjectType()
export class User {
  @PrimaryGeneratedColumn("uuid")
  @Field(() => ID)
  id: string

  @Column({ unique: true })
  @Field()
  email: string

  @Column()
  @Field()
  firstName: string

  @Column()
  @Field()
  lastName: string

  @Column({ nullable: true })
  @Field({ nullable: true })
  avatar?: string

  @Column({ default: true })
  @Field()
  isActive: boolean

  @Column({ type: "jsonb", nullable: true })
  @Field(() => String, { nullable: true })
  metadata?: Record<string, any>

  @OneToMany(
    () => Post,
    (post) => post.author,
  )
  @Field(() => [Post])
  posts: Post[]

  @CreateDateColumn()
  @Field()
  createdAt: Date

  @UpdateDateColumn()
  @Field()
  updatedAt: Date

  // Computed fields
  @Field()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`
  }

  @Field()
  get postsCount(): number {
    return this.posts?.length || 0
  }
}
