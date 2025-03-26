import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity("email_templates")
export class EmailTemplate {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ unique: true })
  name: string

  @Column()
  subject: string

  @Column("text")
  content: string

  @Column({ nullable: true })
  description: string

  @Column({ default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

