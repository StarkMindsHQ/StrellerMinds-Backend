import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm"
import { Webhook } from "./webhook.entity"

export enum DeliveryStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
  RETRYING = "retrying",
}

@Entity("webhook_deliveries")
@Index(["status"])
@Index(["createdAt"])
@Index(["webhookId"])
export class WebhookDelivery {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  webhookId: string

  @ManyToOne(() => Webhook, { onDelete: "CASCADE" })
  @JoinColumn({ name: "webhookId" })
  webhook: Webhook

  @Column({ length: 100 })
  event: string

  @Column({ type: "json" })
  payload: any

  @Column({
    type: "enum",
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  status: DeliveryStatus

  @Column({ type: "int", nullable: true })
  responseStatus: number

  @Column({ type: "text", nullable: true })
  responseBody: string

  @Column({ type: "json", nullable: true })
  responseHeaders: Record<string, string>

  @Column({ type: "int", default: 0 })
  attempts: number

  @Column({ type: "text", nullable: true })
  errorMessage: string

  @Column({ type: "timestamp", nullable: true })
  nextRetryAt: Date

  @Column({ type: "timestamp", nullable: true })
  deliveredAt: Date

  @CreateDateColumn()
  createdAt: Date
}
