import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

export type SyncStatus = "pending" | "processing" | "completed" | "failed" | "cancelled"
export type SyncOperation = "create" | "update" | "delete" | "batch"

@Entity("offline_sync")
@Index(["userId", "status"])
@Index(["status", "priority", "createdAt"])
export class OfflineSync {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255, nullable: true })
  @Index()
  userId?: string

  @Column({ type: "varchar", length: 100 })
  operation: SyncOperation

  @Column({ type: "varchar", length: 100 })
  entityType: string

  @Column({ type: "varchar", length: 255, nullable: true })
  entityId?: string

  @Column({ type: "json" })
  data: any

  @Column({ type: "json", nullable: true })
  metadata?: {
    clientTimestamp: Date
    deviceId?: string
    connectionType?: string
    retryCount?: number
  }

  @Column({ type: "varchar", length: 50, default: "pending" })
  @Index()
  status: SyncStatus

  @Column({ type: "integer", default: 5 })
  priority: number

  @Column({ type: "text", nullable: true })
  errorMessage?: string

  @Column({ type: "json", nullable: true })
  result?: any

  @Column({ type: "timestamp", nullable: true })
  processedAt?: Date

  @Column({ type: "integer", default: 0 })
  retryCount: number

  @Column({ type: "integer", default: 3 })
  maxRetries: number

  @Column({ type: "timestamp", nullable: true })
  nextRetryAt?: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
