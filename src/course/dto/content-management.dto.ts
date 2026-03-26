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
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ContentFormat } from '../enums/content-format.enum';
import { CollaborationRole } from '../enums/collaboration-role.enum';
import { ApprovalDecision } from '../enums/approval-decision.enum';

export class CreateContentDto {
  @ApiProperty({ description: 'The unique identifier of the lesson this content belongs to', example: 'lesson-uuid' })
  @IsUUID()
  @IsNotEmpty()
  lessonId: string;

  @ApiProperty({ description: 'Title of the content piece', example: 'Introduction to Assets' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'The format of the content', enum: ContentFormat, example: ContentFormat.TEXT })
  @IsEnum(ContentFormat)
  format: ContentFormat;

  @ApiPropertyOptional({ description: 'Structured JSON body for the content', example: { text: '# Hello World' } })
  @IsOptional()
  @IsObject()
  body?: Record<string, any>;

  @ApiPropertyOptional({ description: 'URL to a video if the format is video', example: 'https://youtube.com/watch?v=...' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Configuration for interactive elements', example: { quiz: true } })
  @IsOptional()
  @IsObject()
  interactiveConfig?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Whether this content can be reused across courses', default: false })
  @IsOptional()
  @IsBoolean()
  reusable?: boolean;

  @ApiPropertyOptional({ description: 'The template ID to derive from', example: 'template-uuid' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: 'The user ID who created the content', example: 'user-uuid' })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'A short summary of what was changed', example: 'Initial draft' })
  @IsOptional()
  @IsString()
  changeSummary?: string;
}

export class UpdateContentDto extends PartialType(CreateContentDto) {
  @ApiPropertyOptional({ description: 'The user ID who updated the content', example: 'user-uuid' })
  @IsOptional()
  @IsString()
  updatedBy?: string;
}

export class CreateTemplateDto {
  @ApiProperty({ description: 'Name of the template', example: 'Video Lesson Template' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Detailed description of the template purpose' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Default format for content created from this template', enum: ContentFormat })
  @IsEnum(ContentFormat)
  format: ContentFormat;

  @ApiProperty({ description: 'The structured blueprint defining the content layout' })
  @IsObject()
  @IsNotEmpty()
  blueprint: Record<string, any>;

  @ApiPropertyOptional({ description: 'Whether this template is available to all instructors', default: false })
  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @ApiPropertyOptional({ description: 'The user ID who created the template' })
  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class CreateContentFromTemplateDto {
  @ApiProperty({ description: 'The ID of the template to use' })
  @IsUUID()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ description: 'The ID of the lesson to attach to' })
  @IsUUID()
  @IsNotEmpty()
  lessonId: string;

  @ApiPropertyOptional({ description: 'Custom title for the new content' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'The user ID of the creator' })
  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class AddCollaboratorDto {
  @ApiProperty({ description: 'User ID of the collaborator' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'The role assigned to the collaborator', enum: CollaborationRole })
  @IsEnum(CollaborationRole)
  role: CollaborationRole;
}

export class ReviewContentDto {
  @ApiProperty({ description: 'User ID of the reviewer' })
  @IsString()
  @IsNotEmpty()
  reviewerId: string;

  @ApiProperty({ description: 'The approval decision', enum: ApprovalDecision })
  @IsEnum(ApprovalDecision)
  decision: ApprovalDecision;

  @ApiPropertyOptional({ description: 'Reviewer comments or feedback' })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class RequestApprovalDto {
  @ApiPropertyOptional({ description: 'Comments to the reviewer' })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class TrackContentEngagementDto {
  @ApiPropertyOptional({ description: 'The user ID of the viewer' })
  @IsOptional()
  @IsString()
  viewerId?: string;

  @ApiPropertyOptional({ description: 'Type of engagement event', example: 'watch_start' })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({ description: 'Time spent viewing in seconds', example: 120 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  viewDurationSeconds?: number;

  @ApiPropertyOptional({ description: 'Number of interactive elements triggered', example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  interactions?: number;

  @ApiPropertyOptional({ description: 'Percentage of content consumed', example: 75 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  completionPercent?: number;

  @ApiPropertyOptional({ description: 'Additional engagement metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
