import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

export type CacheStrategy = "cache-first" | "network-first" | "cache-only" | "network-only" | "stale-while-revalidate"

@Entity("cache_policies")
@Index(["route", "method"])
export class CachePolicy {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255 })
  @Index()
  route: string

  @Column({ type: "varchar", length: 10, default: "GET" })
  method: string

  @Column({ type: "varchar", length: 50 })
  strategy: CacheStrategy

  @Column({ type: "integer", default: 3600 })
  maxAge: number

  @Column({ type: "integer", default: 86400 })
  staleWhileRevalidate?: number

  @Column({ type: "json", nullable: true })
  headers?: Record<string, string>

  @Column({ type: "json", nullable: true })
  conditions?: {
    userAgent?: string[]
    contentType?: string[]
    statusCodes?: number[]
  }

  @Column({ type: "boolean", default: true })
  @Index()
  isActive: boolean

  @Column({ type: "integer", default: 0 })
  priority: number

  @Column({ type: "text", nullable: true })
  description?: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
