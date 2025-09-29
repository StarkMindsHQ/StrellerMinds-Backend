import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { NotificationChannel, NotificationType } from "./notification.entity"

@Entity("notification_analytics")
@Index(["notificationType", "channel", "date"])
export class NotificationAnalytics {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "enum", enum: NotificationType })
  notificationType: NotificationType

  @Column({ type: "enum", enum: NotificationChannel })
  channel: NotificationChannel

  @Column({ type: "date" })
  date: Date // Aggregated daily

  @Column({ type: "int", default: 0 })
  sentCount: number

  @Column({ type: "int", default: 0 })
  openedCount: number // For in-app/email

  @Column({ type: "int", default: 0 })
  readCount: number // For in-app/email

  @Column({ type: "int", default: 0 })
  clickedCount: number // For email/push/in-app with links

  @Column({ type: "float", default: 0 })
  deliverySuccessRate: number // (sentCount - failedCount) / sentCount

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date
}
