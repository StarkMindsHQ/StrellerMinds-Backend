import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

export enum EventType {
  USER_ACTION = "user_action",
  SYSTEM_EVENT = "system_event",
  BUSINESS_EVENT = "business_event",
  ERROR_EVENT = "error_event",
}

@Entity("analytics_events")
@Index(["eventType", "timestamp"])
@Index(["userId", "timestamp"])
@Index(["sessionId", "timestamp"])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({
    type: "enum",
    enum: EventType,
  })
  eventType: EventType

  @Column()
  eventName: string

  @Column({ nullable: true })
  userId?: string

  @Column({ nullable: true })
  sessionId?: string

  @Column("jsonb")
  properties: Record<string, any>

  @Column("jsonb", { nullable: true })
  context?: Record<string, any>

  @Column({ type: "timestamp" })
  timestamp: Date

  @Column({ nullable: true })
  source?: string

  @Column({ nullable: true })
  channel?: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
