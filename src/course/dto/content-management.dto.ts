import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ContentFormat } from '../enums/content-format.enum';
import { CollaborationRole } from '../enums/collaboration-role.enum';
import { ApprovalDecision } from '../enums/approval-decision.enum';

export class CreateContentDto {
  @IsUUID()
  lessonId: string;

  @IsString()
  title: string;

  @IsEnum(ContentFormat)
  format: ContentFormat;

  @IsOptional()
  @IsObject()
  body?: Record<string, any>;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsObject()
  interactiveConfig?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  reusable?: boolean;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  changeSummary?: string;
}

export class UpdateContentDto extends PartialType(CreateContentDto) {
  @IsOptional()
  @IsString()
  updatedBy?: string;
}

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ContentFormat)
  format: ContentFormat;

  @IsObject()
  blueprint: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class CreateContentFromTemplateDto {
  @IsUUID()
  templateId: string;

  @IsUUID()
  lessonId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class AddCollaboratorDto {
  @IsString()
  userId: string;

  @IsEnum(CollaborationRole)
  role: CollaborationRole;
}

export class ReviewContentDto {
  @IsString()
  reviewerId: string;

  @IsEnum(ApprovalDecision)
  decision: ApprovalDecision;

  @IsOptional()
  @IsString()
  comments?: string;
}

export class RequestApprovalDto {
  @IsOptional()
  @IsString()
  comments?: string;
}

export class TrackContentEngagementDto {
  @IsOptional()
  @IsString()
  viewerId?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  viewDurationSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  interactions?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  completionPercent?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
