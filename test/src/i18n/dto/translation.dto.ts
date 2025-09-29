import { IsString, IsOptional, IsEnum, IsObject, IsArray } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { TranslationStatus } from "../entities/translation.entity"

export class CreateTranslationDto {
  @ApiProperty({ description: "Translation key" })
  @IsString()
  key: string

  @ApiProperty({ description: "Locale code" })
  @IsString()
  locale: string

  @ApiProperty({ description: "Namespace" })
  @IsString()
  namespace: string

  @ApiProperty({ description: "Translation value" })
  @IsString()
  value: string

  @ApiProperty({ description: "Description of the translation", required: false })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ description: "Context information", required: false })
  @IsOptional()
  @IsString()
  context?: string

  @ApiProperty({ description: "Additional metadata", required: false })
  @IsOptional()
  @IsObject()
  metadata?: any
}

export class UpdateTranslationDto {
  @ApiProperty({ description: "Translation value", required: false })
  @IsOptional()
  @IsString()
  value?: string

  @ApiProperty({ description: "Description of the translation", required: false })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ description: "Context information", required: false })
  @IsOptional()
  @IsString()
  context?: string

  @ApiProperty({ enum: TranslationStatus, required: false })
  @IsOptional()
  @IsEnum(TranslationStatus)
  status?: TranslationStatus

  @ApiProperty({ description: "Additional metadata", required: false })
  @IsOptional()
  @IsObject()
  metadata?: any
}

export class TranslationFiltersDto {
  @ApiProperty({ description: "Locale code", required: false })
  @IsOptional()
  @IsString()
  locale?: string

  @ApiProperty({ description: "Namespace", required: false })
  @IsOptional()
  @IsString()
  namespace?: string

  @ApiProperty({ enum: TranslationStatus, required: false })
  @IsOptional()
  @IsEnum(TranslationStatus)
  status?: TranslationStatus

  @ApiProperty({ description: "Search term", required: false })
  @IsOptional()
  @IsString()
  search?: string

  @ApiProperty({ description: "Translation keys", required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keys?: string[]
}

export class SetUserLocaleDto {
  @ApiProperty({ description: "Locale code" })
  @IsString()
  locale: string

  @ApiProperty({ description: "User preferences", required: false })
  @IsOptional()
  @IsObject()
  preferences?: any
}

export class TranslateDto {
  @ApiProperty({ description: "Translation key" })
  @IsString()
  key: string

  @ApiProperty({ description: "Locale code", required: false })
  @IsOptional()
  @IsString()
  locale?: string

  @ApiProperty({ description: "Namespace", required: false })
  @IsOptional()
  @IsString()
  namespace?: string

  @ApiProperty({ description: "Translation arguments", required: false })
  @IsOptional()
  @IsObject()
  args?: any
}

export class TranslateMultipleDto {
  @ApiProperty({ description: "Translation keys" })
  @IsArray()
  @IsString({ each: true })
  keys: string[]

  @ApiProperty({ description: "Locale code", required: false })
  @IsOptional()
  @IsString()
  locale?: string

  @ApiProperty({ description: "Namespace", required: false })
  @IsOptional()
  @IsString()
  namespace?: string

  @ApiProperty({ description: "Translation arguments", required: false })
  @IsOptional()
  @IsObject()
  args?: any
}
