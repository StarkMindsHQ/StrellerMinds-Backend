import { Course } from "../../courses/entities/course.entity"
import { User } from "../../users/entities/user.entity"
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, CreateDateColumn } from "typeorm"


@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount: number

  @Column()
  paymentMethod: string // credit_card, paypal, etc.

  @Column()
  status: string // pending, completed, failed, refunded

  @Column({ nullable: true })
  transactionId: string

  @CreateDateColumn()
  paymentDate: Date

  // Many-to-One relationships
  @ManyToOne(
    () => User,
    (user) => user.payments,
    { nullable: false },
  )
  @Index()
  user: User

  @ManyToOne(
    () => Course,
    (course) => course.payments,
    { nullable: false },
  )
  @Index()
  course: Course
}

