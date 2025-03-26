import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from "typeorm"

@Entity("email_logs")
export class EmailLog {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  recipient: string

  @Column()
  subject: string

  @Column()
  @Index()
  templateName: string

  @Column({ nullable: true })
  messageId: string

  @Column()
  @Index()
  status: "sent" | "failed" | "opened" | "clicked"

  @Column({ nullable: true })
  error: string

  @CreateDateColumn()
  @Index()
  createdAt: Date

  @Column({ nullable: true })
  openedAt: Date

  @Column({ nullable: true })
  clickedAt: Date

  @Column({ nullable: true, type: "jsonb" })
  metadata: Record<string, any>
}

