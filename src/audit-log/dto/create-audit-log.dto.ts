import { IsEnum, IsString, IsUUID, IsOptional, IsBoolean, IsNumber, IsObject } from "class-validator"
import { AuditActionType, AuditSeverity } from "../entities/audit-log.entity"

export class CreateAuditLogDto {
  @IsUUID()
  adminId: string

  @IsString()
  adminEmail: string

  @IsString()
  adminRole: string

  @IsEnum(AuditActionType)
  actionType: AuditActionType

  @IsString()
  resourceType: string

  @IsOptional()
  @IsUUID()
  resourceId?: string

  @IsString()
  description: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>

  @IsOptional()
  @IsObject()
  oldValues?: Record<string, any>

  @IsOptional()
  @IsObject()
  newValues?: Record<string, any>

  @IsOptional()
  @IsEnum(AuditSeverity)
  severity?: AuditSeverity

  @IsString()
  ipAddress: string

  @IsOptional()
  @IsString()
  userAgent?: string

  @IsOptional()
  @IsString()
  sessionId?: string

  @IsOptional()
  @IsBoolean()
  isSuccessful?: boolean

  @IsOptional()
  @IsString()
  errorMessage?: string

  @IsOptional()
  @IsNumber()
  duration?: number
}
