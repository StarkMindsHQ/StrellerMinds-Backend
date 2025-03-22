import { User } from "../../users/entities/user.entity"
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, CreateDateColumn } from "typeorm"


@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ length: 255 })
  title: string

  @Column({ type: "text", nullable: true })
  message: string

  @Column({ default: false })
  isRead: boolean

  @Column()
  type: string // course_update, forum_reply, payment, etc.

  @Column({ type: "json", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  // Many-to-One relationship
  @ManyToOne(
    () => User,
    (user) => user.notifications,
    { nullable: false },
  )
  @Index()
  user: User
}

