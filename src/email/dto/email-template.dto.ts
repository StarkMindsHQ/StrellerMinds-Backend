import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  Max,
  ValidateNested,
  IsObject,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateCategory, TemplateVariable } from '../entities/email-template.entity';
import { AbTestWinnerCriteria } from '../entities/email-ad-test.entity';

// ─── Template ─────────────────────────────────────────────────────────────────

export class CreateTemplateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  slug: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TemplateCategory)
  @IsOptional()
  category?: TemplateCategory;

  @IsArray()
  @IsOptional()
  availableLocales?: string[];

  @IsString()
  @IsOptional()
  defaultLocale?: string;

  @IsArray()
  @IsOptional()
  variables?: TemplateVariable[];
}

export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TemplateCategory)
  @IsOptional()
  category?: TemplateCategory;

  @IsArray()
  @IsOptional()
  availableLocales?: string[];

  @IsArray()
  @IsOptional()
  variables?: TemplateVariable[];
}

// ─── Version ──────────────────────────────────────────────────────────────────

export class CreateTemplateVersionDto {
  @IsString()
  @IsOptional()
  locale?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  subject: string;

  @IsString()
  @MinLength(1)
  htmlBody: string;

  @IsString()
  @IsOptional()
  textBody?: string;

  @IsString()
  @IsOptional()
  preheader?: string;

  @IsString()
  @IsOptional()
  mjmlSource?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  changeNotes?: string;
}

export class PublishVersionDto {
  @IsInt()
  @Min(1)
  version: number;

  @IsString()
  @IsOptional()
  locale?: string;
}

export class RollbackVersionDto {
  @IsInt()
  @Min(1)
  targetVersion: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

// ─── A/B Test ─────────────────────────────────────────────────────────────────

export class AbTestVariantDto {
  @IsString()
  id: string;

  @IsString()
  label: string;

  @IsUUID()
  templateVersionId: string;

  @IsInt()
  @Min(1)
  @Max(99)
  weight: number;
}

export class CreateAbTestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  hypothesis?: string;

  @IsEnum(AbTestWinnerCriteria)
  @IsOptional()
  winnerCriteria?: AbTestWinnerCriteria;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AbTestVariantDto)
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  variants: AbTestVariantDto[];

  @IsInt()
  @Min(50)
  @Max(99)
  @IsOptional()
  confidenceThreshold?: number;

  @IsInt()
  @Min(10)
  @IsOptional()
  minSampleSize?: number;

  @IsString()
  @IsOptional()
  scheduledEndAt?: string;
}

// ─── Rendering ────────────────────────────────────────────────────────────────

export class RenderTemplateDto {
  @IsString()
  slug: string;

  @IsObject()
  variables: Record<string, any>;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsUUID()
  @IsOptional()
  recipientId?: string;

  @IsString()
  @IsOptional()
  recipientEmail?: string;
}

export class TestSendDto {
  @IsString()
  slug: string;

  @IsObject()
  variables: Record<string, any>;

  @IsString()
  toEmail: string;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsInt()
  @IsOptional()
  version?: number;
}

// ─── Analytics query ──────────────────────────────────────────────────────────

export class TemplateAnalyticsQueryDto {
  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsUUID()
  @IsOptional()
  abTestId?: string;
}
