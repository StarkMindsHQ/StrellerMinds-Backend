import type { AuditActionType, AuditSeverity } from "../entities/audit-log.entity"

export class AuditLogResponseDto {
  id: string
  adminId: string
  adminEmail: string
  adminRole: string
  actionType: AuditActionType
  resourceType: string
  resourceId?: string
  description: string
  metadata?: Record<string, any>
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  severity: AuditSeverity
  ipAddress: string
  userAgent?: string
  sessionId?: string
  isSuccessful: boolean
  errorMessage?: string
  duration?: number
  createdAt: Date
}

export class PaginatedAuditLogResponseDto {
  data: AuditLogResponseDto[]
  total: number
  page: number
  limit: number
  totalPages: number
}
