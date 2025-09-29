import { PartialType } from "@nestjs/mapped-types"
import { IsEnum, IsOptional } from "class-validator"
import { CreateWebhookDto } from "./create-webhook.dto"
import { WebhookStatus } from "../entities/webhook.entity"

export class UpdateWebhookDto extends PartialType(CreateWebhookDto) {
  @IsOptional()
  @IsEnum(WebhookStatus)
  status?: WebhookStatus
}
