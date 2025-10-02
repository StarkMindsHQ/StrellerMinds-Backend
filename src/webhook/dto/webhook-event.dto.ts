import { IsString, IsObject, IsOptional, IsUUID } from 'class-validator';

export class WebhookEventDto {
  @IsString()
  event: string;

  @IsObject()
  data: any;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
