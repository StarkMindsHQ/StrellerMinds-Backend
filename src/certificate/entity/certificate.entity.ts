import { Course } from "../../courses/entities/course.entity"
import { User } from "../../users/entities/user.entity"
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, CreateDateColumn } from "typeorm"

@Entity("certificates")
export class Certificate {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  certificateNumber: string

  @Column({ type: "date" })
  issueDate: Date

  @Column({ nullable: true })
  pdfUrl: string

  @CreateDateColumn()
  createdAt: Date

  // Many-to-One relationships
  @ManyToOne(() => User, user => user.certificates, { nullable: false })
  @Index()
  user: Promise<User>

  @ManyToOne(() => Course, course => course.certificates, { nullable: false })
  @Index()
  course: Promise<Course>
}

