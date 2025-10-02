/**
 * DTO for creating a new course.
 *
 * Used for course creation by instructors and admins.
 *
 * All fields are documented for OpenAPI/Swagger UI.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  IsArray,
  ArrayMinSize,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { User } from '../../users/entities/user.entity';
import { CreateCourseModuleDto } from './create.course.moduledto';
import { SubscriptionPlan } from '../../payment/entities/subscription.entity';

export class CreateCourseDto {
  @ApiProperty({
    example: 'Introduction to Blockchain',
    maxLength: 255,
    description: 'Course title',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: 'Learn the basics of blockchain technology.',
    description: 'Course description',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: 99.99, minimum: 0, description: 'Course price (optional)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({
    example: 10,
    minimum: 0,
    description: 'Course duration in hours (optional)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  durationInHours?: number;

  @ApiPropertyOptional({
    example: 'draft',
    description: 'Course status (draft, published, archived)',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.com/thumbnail.jpg',
    description: 'Course thumbnail URL (optional)',
  })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiPropertyOptional({ example: false, description: 'Whether the course is premium gated' })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @ApiPropertyOptional({
    enum: SubscriptionPlan,
    description: 'Minimum subscription plan required',
  })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  requiredPlan?: SubscriptionPlan;

  @ApiProperty({ example: 'uuid-instructor', description: 'Instructor user ID' })
  @IsUUID()
  @IsNotEmpty()
  instructorId: string;

  @ApiProperty({ example: 'uuid-category', description: 'Category ID' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of tag IDs (optional)',
    example: ['uuid-tag-1', 'uuid-tag-2'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @IsUUID(undefined, { each: true })
  tagIds?: string[];

  @ApiPropertyOptional({
    type: [CreateCourseModuleDto],
    description: 'Array of course modules (optional)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @Type(() => CreateCourseModuleDto)
  modules?: CreateCourseModuleDto[];
}
