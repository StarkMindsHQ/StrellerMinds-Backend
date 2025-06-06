import { SetMetadata } from "@nestjs/common"
import type { AuditActionType, AuditSeverity } from "../entities/audit-log.entity"

export interface AuditLogOptions {
  actionType: AuditActionType
  resourceType: string
  description?: string
  severity?: AuditSeverity
  includeRequestBody?: boolean
  includeResponseBody?: boolean
}

export const AUDIT_LOG_KEY = "audit_log"

export const AuditLog = (options: AuditLogOptions) => SetMetadata(AUDIT_LOG_KEY, options)
