import { IsArray, IsEnum, IsObject, IsOptional, IsString } from "class-validator"
import { ReportFormat } from "../interfaces/analytics.interface"

export class ReportExportDto {
  @IsArray()
  data: any[] // The data to be exported

  @IsEnum(ReportFormat)
  format: ReportFormat

  @IsString()
  reportName: string

  @IsOptional()
  @IsString()
  reportTitle?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}
