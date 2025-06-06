import { IsOptional, IsEnum, IsUUID, IsDateString, IsString, IsBoolean, IsNumber, Min, Max } from "class-validator"
import { Transform, Type } from "class-transformer"
import { AuditActionType, AuditSeverity } from "../entities/audit-log.entity"

export class AuditLogFilterDto {
  @IsOptional()
  @IsUUID()
  adminId?: string

  @IsOptional()
  @IsString()
  adminEmail?: string

  @IsOptional()
  @IsEnum(AuditActionType)
  actionType?: AuditActionType

  @IsOptional()
  @IsString()
  resourceType?: string

  @IsOptional()
  @IsUUID()
  resourceId?: string

  @IsOptional()
  @IsEnum(AuditSeverity)
  severity?: AuditSeverity

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true")
  isSuccessful?: boolean

  @IsOptional()
  @IsString()
  ipAddress?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20

  @IsOptional()
  @IsString()
  sortBy?: string = "createdAt"

  @IsOptional()
  @IsEnum(["ASC", "DESC"])
  sortOrder?: "ASC" | "DESC" = "DESC"
}
