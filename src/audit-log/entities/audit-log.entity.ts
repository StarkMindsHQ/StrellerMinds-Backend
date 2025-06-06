import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm"

export enum AuditActionType {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  PASSWORD_CHANGE = "PASSWORD_CHANGE",
  ROLE_CHANGE = "ROLE_CHANGE",
  PERMISSION_CHANGE = "PERMISSION_CHANGE",
  SYSTEM_CONFIG = "SYSTEM_CONFIG",
  DATA_EXPORT = "DATA_EXPORT",
  DATA_IMPORT = "DATA_IMPORT",
  BULK_OPERATION = "BULK_OPERATION",
}

export enum AuditSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

@Entity("audit_logs")
@Index(["adminId", "createdAt"])
@Index(["actionType", "createdAt"])
@Index(["severity", "createdAt"])
@Index(["resourceType", "createdAt"])
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  @Index()
  adminId: string

  @Column({ length: 255 })
  adminEmail: string

  @Column({ length: 100 })
  adminRole: string

  @Column({
    type: "enum",
    enum: AuditActionType,
  })
  @Index()
  actionType: AuditActionType

  @Column({ length: 255 })
  resourceType: string

  @Column({ type: "uuid", nullable: true })
  resourceId: string

  @Column({ type: "text" })
  description: string

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @Column({ type: "jsonb", nullable: true })
  oldValues: Record<string, any>

  @Column({ type: "jsonb", nullable: true })
  newValues: Record<string, any>

  @Column({
    type: "enum",
    enum: AuditSeverity,
    default: AuditSeverity.MEDIUM,
  })
  severity: AuditSeverity

  @Column({ length: 45 })
  ipAddress: string

  @Column({ length: 500, nullable: true })
  userAgent: string

  @Column({ length: 255, nullable: true })
  sessionId: string

  @Column({ type: "boolean", default: false })
  isSuccessful: boolean

  @Column({ type: "text", nullable: true })
  errorMessage: string

  @Column({ type: "integer", nullable: true })
  duration: number // in milliseconds

  @CreateDateColumn()
  @Index()
  createdAt: Date

  // Checksum for integrity verification
  @Column({ length: 64, nullable: true })
  checksum: string
}
