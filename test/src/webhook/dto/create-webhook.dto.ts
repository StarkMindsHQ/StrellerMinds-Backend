import { IsString, IsUrl, IsArray, IsEnum, IsOptional, IsInt, Min, Max, IsObject } from "class-validator"
import { WebhookEvent } from "../entities/webhook.entity"

export class CreateWebhookDto {
  @IsString()
  name: string

  @IsUrl()
  url: string

  @IsArray()
  @IsEnum(WebhookEvent, { each: true })
  events: WebhookEvent[]

  @IsOptional()
  @IsString()
  secret?: string

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxRetries?: number

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(300)
  timeoutSeconds?: number

  @IsOptional()
  @IsString()
  description?: string
}
