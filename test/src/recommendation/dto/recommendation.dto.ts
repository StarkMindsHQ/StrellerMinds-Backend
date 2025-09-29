import { IsEnum, IsOptional, IsString, IsNumber, IsArray, IsUUID, IsBoolean, Min, Max, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecommendationType, RecommendationReason, RecommendationStatus } from '../entities/recommendation.entity';

export class CreateRecommendationDto {
  @ApiProperty({ description: 'User ID for the recommendation' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Course ID if recommending a course' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiProperty({ enum: RecommendationType, description: 'Type of recommendation' })
  @IsEnum(RecommendationType)
  recommendationType: RecommendationType;

  @ApiProperty({ enum: RecommendationReason, description: 'Reason for the recommendation' })
  @IsEnum(RecommendationReason)
  reason: RecommendationReason;

  @ApiProperty({ description: 'Confidence score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  confidenceScore: number;

  @ApiProperty({ description: 'Relevance score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  relevanceScore: number;

  @ApiPropertyOptional({ description: 'Priority level (higher = more important)' })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ description: 'Human-readable explanation' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'ML features used for recommendation' })
  @IsOptional()
  mlFeatures?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Expiration date for the recommendation' })
  @IsOptional()
  @Type(() => Date)
  expiresAt?: Date;
}

export class UpdateRecommendationDto {
  @ApiPropertyOptional({ enum: RecommendationStatus, description: 'Status of the recommendation' })
  @IsOptional()
  @IsEnum(RecommendationStatus)
  status?: RecommendationStatus;

  @ApiPropertyOptional({ description: 'Priority level' })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class RecommendationResponseDto {
  @ApiProperty({ description: 'Recommendation ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiPropertyOptional({ description: 'Course ID' })
  courseId?: string;

  @ApiProperty({ enum: RecommendationType, description: 'Type of recommendation' })
  recommendationType: RecommendationType;

  @ApiProperty({ enum: RecommendationReason, description: 'Reason for recommendation' })
  reason: RecommendationReason;

  @ApiProperty({ enum: RecommendationStatus, description: 'Status of recommendation' })
  status: RecommendationStatus;

  @ApiProperty({ description: 'Confidence score' })
  confidenceScore: number;

  @ApiProperty({ description: 'Relevance score' })
  relevanceScore: number;

  @ApiProperty({ description: 'Priority level' })
  priority: number;

  @ApiPropertyOptional({ description: 'Explanation text' })
  explanation?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Expiration date' })
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Course details if applicable' })
  course?: {
    id: string;
    title: string;
    description?: string;
    thumbnail?: string;
    difficulty?: string;
    duration?: number;
    rating?: number;
  };
}

export class GetRecommendationsQueryDto {
  @ApiPropertyOptional({ description: 'Number of recommendations to return', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Offset for pagination', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ enum: RecommendationType, description: 'Filter by recommendation type' })
  @IsOptional()
  @IsEnum(RecommendationType)
  type?: RecommendationType;

  @ApiPropertyOptional({ enum: RecommendationStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(RecommendationStatus)
  status?: RecommendationStatus;

  @ApiPropertyOptional({ description: 'Minimum confidence score', minimum: 0, maximum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  minConfidence?: number;

  @ApiPropertyOptional({ description: 'Include expired recommendations', default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeExpired?: boolean = false;

  @ApiPropertyOptional({ description: 'Sort by field', enum: ['createdAt', 'confidenceScore', 'relevanceScore', 'priority'] })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'confidenceScore' | 'relevanceScore' | 'priority' = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class RecommendationInteractionDto {
  @ApiProperty({ description: 'Recommendation ID' })
  @IsUUID()
  recommendationId: string;

  @ApiProperty({ description: 'Interaction type', enum: ['view', 'click', 'dismiss'] })
  @IsEnum(['view', 'click', 'dismiss'])
  interactionType: 'view' | 'click' | 'dismiss';

  @ApiPropertyOptional({ description: 'Additional context or metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class BulkRecommendationRequestDto {
  @ApiProperty({ description: 'List of user IDs to generate recommendations for' })
  @IsArray()
  @IsUUID(4, { each: true })
  userIds: string[];

  @ApiPropertyOptional({ description: 'Number of recommendations per user', default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  recommendationsPerUser?: number = 5;

  @ApiPropertyOptional({ enum: RecommendationType, description: 'Filter by recommendation type' })
  @IsOptional()
  @IsEnum(RecommendationType)
  type?: RecommendationType;

  @ApiPropertyOptional({ description: 'Minimum confidence threshold', minimum: 0, maximum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  minConfidence?: number = 0.1;
}

export class RecommendationFeedbackDto {
  @ApiProperty({ description: 'Recommendation ID' })
  @IsUUID()
  recommendationId: string;

  @ApiProperty({ description: 'Feedback score (1-5 or 0-1)', minimum: 0, maximum: 5 })
  @IsNumber()
  @Min(0)
  @Max(5)
  score: number;

  @ApiPropertyOptional({ description: 'Feedback type', enum: ['explicit', 'implicit'] })
  @IsOptional()
  @IsString()
  feedbackType?: 'explicit' | 'implicit' = 'explicit';

  @ApiPropertyOptional({ description: 'Additional feedback comments' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Context of the feedback' })
  @IsOptional()
  metadata?: Record<string, any>;
}
