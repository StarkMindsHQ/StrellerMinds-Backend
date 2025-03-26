import { Course } from "../../courses/entities/course.entity"
import { User } from "../../users/entities/user.entity"
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { Subscription } from "./subscription.entity"

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
  XLM = 'xlm'
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription'
}

@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount: number

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus

  @Column({ type: 'enum', enum: PaymentType })
  type: PaymentType

  @Column({ nullable: true })
  transactionId: string

  @Column({ nullable: true })
  receiptUrl: string

  @Column({ nullable: true })
  refundReason: string

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Many-to-One relationships
  @ManyToOne(() => User, (user) => user.payments, { nullable: false })
  @Index()
  user: User

  @ManyToOne(() => Course, (course) => course.payments, { nullable: true })
  @Index()
  course: Course

  @ManyToOne(() => Subscription, { nullable: true })
  @Index()
  subscription: Subscription
}
