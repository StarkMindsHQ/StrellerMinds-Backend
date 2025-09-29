import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, IsObject, Min } from "class-validator"
import { CertificationCategory, CertificationLevel } from "../entities/certification-type.entity"

export class CreateCertificationTypeDto {
  @IsString()
  name: string

  @IsString()
  description: string

  @IsEnum(CertificationCategory)
  category: CertificationCategory

  @IsEnum(CertificationLevel)
  level: CertificationLevel

  @IsOptional()
  @IsObject()
  requirements?: {
    minScore?: number
    requiredCourses?: string[]
    prerequisites?: string[]
    validityPeriod?: number
    renewalRequired?: boolean
  }

  @IsOptional()
  @IsObject()
  template?: {
    backgroundColor?: string
    textColor?: string
    logoUrl?: string
    layout?: string
    customFields?: Record<string, any>
  }

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsNumber()
  @Min(0)
  validityDays?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number
}
