import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"
import { User } from "../../users/entities/user.entity"

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PENDING = 'pending'
}

@Entity("subscriptions")
export class Subscription {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @ManyToOne(() => User, { nullable: false })
  @Index()
  user: User

  @Column()
  planName: string

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount: number

  @Column()
  billingCycle: string // monthly, yearly, etc.

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.PENDING })
  status: SubscriptionStatus

  @Column()
  nextBillingDate: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ nullable: true })
  cancelledAt: Date
}
