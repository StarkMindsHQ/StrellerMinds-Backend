import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, Unique } from "typeorm"

export enum EmailType {
  AUTHENTICATION = "authentication",
  MARKETING = "marketing",
  COURSE_UPDATES = "course_updates",
  FORUM_NOTIFICATIONS = "forum_notifications",
  SYSTEM_NOTIFICATIONS = "system_notifications",
}

@Entity("email_preferences")
@Unique(["email", "emailType"])
export class EmailPreference {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  email: string

  @Column({
    type: "enum",
    enum: EmailType,
    default: EmailType.AUTHENTICATION,
  })
  @Index()
  emailType: EmailType

  @Column({ default: false })
  optOut: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

