/**
 * Example DTO demonstrating user-friendly validation decorators
 * 
 * This file shows how to use the validation system with:
 * - User-friendly error messages
 * - Field-specific labels
 * - Localized validation messages
 * - Swagger documentation
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IsUserFriendlyRequired,
  IsUserFriendlyEmail,
  MinLengthUserFriendly,
  MaxLengthUserFriendly,
  IsStrongPasswordUserFriendly,
  IsUsernameUserFriendly,
  IsUserFriendlyUrl,
  IsUserFriendlyPhone,
  IsUserFriendlyDate,
  IsFutureDate,
  MinValueUserFriendly,
  MaxValueUserFriendly,
  IsOneOfUserFriendly,
  ArrayNotEmptyUserFriendly,
  PasswordsMatch,
  IsSlugUserFriendly,
  MaxFileSize,
  AllowedFileTypes,
} from '../user-friendly.validators';
import { ValidationFieldLabels } from '../validation-messages.constants';

// Extend field labels with custom labels for this example
Object.assign(ValidationFieldLabels, {
  courseTitle: 'Course title',
  courseDescription: 'Course description',
  coursePrice: 'Course price',
  courseCapacity: 'Maximum students',
  courseStartDate: 'Start date',
  courseEndDate: 'End date',
  instructorName: 'Instructor name',
  instructorBio: 'Instructor biography',
  lessonTitle: 'Lesson title',
  lessonDuration: 'Lesson duration',
});

/**
 * Example: User Registration DTO
 * Demonstrates common validation patterns for registration
 */
export class UserRegistrationExampleDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsUserFriendlyEmail()
  @IsUserFriendlyRequired()
  email: string;

  @ApiProperty({
    description: 'Unique username',
    example: 'johndoe123',
  })
  @IsUsernameUserFriendly()
  @IsUserFriendlyRequired()
  username: string;

  @ApiProperty({
    description: 'Strong password',
    example: 'SecurePass123!',
  })
  @MinLengthUserFriendly(8)
  @MaxLengthUserFriendly(128)
  @IsStrongPasswordUserFriendly()
  @IsUserFriendlyRequired()
  password: string;

  @ApiProperty({
    description: 'Password confirmation (must match password)',
    example: 'SecurePass123!',
  })
  @PasswordsMatch('password')
  @IsUserFriendlyRequired()
  confirmPassword: string;

  @ApiPropertyOptional({
    description: 'First name',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  @MaxLengthUserFriendly(50)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  @MaxLengthUserFriendly(50)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Phone number with country code',
    example: '+1-555-123-4567',
  })
  @IsOptional()
  @IsUserFriendlyPhone()
  phoneNumber?: string;
}

/**
 * Example: Course Creation DTO
 * Demonstrates validation for course creation with nested objects
 */
export class CreateCourseExampleDto {
  @ApiProperty({
    description: 'Course title',
    example: 'Introduction to Blockchain Development',
    minLength: 5,
    maxLength: 200,
  })
  @IsUserFriendlyRequired()
  @MinLengthUserFriendly(5)
  @MaxLengthUserFriendly(200)
  title: string;

  @ApiProperty({
    description: 'URL-friendly course identifier',
    example: 'intro-blockchain-development',
  })
  @IsSlugUserFriendly()
  @IsUserFriendlyRequired()
  slug: string;

  @ApiPropertyOptional({
    description: 'Course description',
    example: 'Learn the fundamentals of blockchain development...',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLengthUserFriendly(5000)
  description?: string;

  @ApiProperty({
    description: 'Course price in USD',
    example: 99.99,
    minimum: 0,
    maximum: 10000,
  })
  @MinValueUserFriendly(0)
  @MaxValueUserFriendly(10000)
  @IsNumber()
  price: number;

  @ApiProperty({
    description: 'Maximum number of students',
    example: 100,
    minimum: 1,
    maximum: 10000,
  })
  @MinValueUserFriendly(1)
  @MaxValueUserFriendly(10000)
  @IsNumber()
  capacity: number;

  @ApiProperty({
    description: 'Course start date',
    example: '2024-06-01',
  })
  @IsUserFriendlyDate()
  @IsFutureDate()
  startDate: Date;

  @ApiPropertyOptional({
    description: 'Course end date',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsUserFriendlyDate()
  endDate?: Date;

  @ApiProperty({
    description: 'Course difficulty level',
    enum: ['beginner', 'intermediate', 'advanced'],
    example: 'beginner',
  })
  @IsOneOfUserFriendly(['beginner', 'intermediate', 'advanced'])
  difficulty: string;

  @ApiPropertyOptional({
    description: 'Course thumbnail URL',
    example: 'https://example.com/thumbnail.jpg',
  })
  @IsOptional()
  @IsUserFriendlyUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Course tags',
    type: [String],
    example: ['blockchain', 'web3', 'crypto'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Whether the course is published',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

/**
 * Example: Lesson DTO (nested object)
 */
export class LessonExampleDto {
  @ApiProperty({
    description: 'Lesson title',
    example: 'Introduction to Smart Contracts',
  })
  @IsUserFriendlyRequired()
  @MinLengthUserFriendly(3)
  @MaxLengthUserFriendly(200)
  title: string;

  @ApiPropertyOptional({
    description: 'Lesson content',
    example: 'In this lesson, we will explore...',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Video URL',
    example: 'https://youtube.com/watch?v=example',
  })
  @IsOptional()
  @IsUserFriendlyUrl()
  videoUrl?: string;

  @ApiProperty({
    description: 'Duration in minutes',
    example: 45,
    minimum: 1,
    maximum: 480,
  })
  @MinValueUserFriendly(1)
  @MaxValueUserFriendly(480)
  @IsNumber()
  durationMinutes: number;
}

/**
 * Example: Course with Lessons DTO
 * Demonstrates nested validation
 */
export class CreateCourseWithLessonsExampleDto {
  @ApiProperty()
  @IsUserFriendlyRequired()
  @MinLengthUserFriendly(5)
  @MaxLengthUserFriendly(200)
  title: string;

  @ApiProperty({
    type: [LessonExampleDto],
  })
  @IsArray()
  @ArrayNotEmptyUserFriendly()
  @ValidateNested({ each: true })
  @Type(() => LessonExampleDto)
  lessons: LessonExampleDto[];
}

/**
 * Example: File Upload DTO
 * Demonstrates file validation
 */
export class UploadDocumentExampleDto {
  @ApiProperty({
    description: 'Document file (PDF, DOC, DOCX)',
    type: 'file',
  })
  @MaxFileSize(10 * 1024 * 1024) // 10MB
  @AllowedFileTypes(['pdf', 'doc', 'docx'])
  file: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Document title',
    example: 'Course Syllabus',
  })
  @IsOptional()
  @IsString()
  @MaxLengthUserFriendly(200)
  title?: string;
}

/**
 * Example Response for Validation Errors
 * 
 * When validation fails, clients receive:
 * 
 * HTTP 422 Unprocessable Entity
 * {
 *   "success": false,
 *   "errorCode": "VALIDATION_ERROR",
 *   "message": "Validation failed. Please check your input.",
 *   "statusCode": 422,
 *   "severity": "low",
 *   "category": "validation",
 *   "errors": [
 *     {
 *       "field": "email",
 *       "code": "EMAIL",
 *       "message": "Please enter a valid email address (e.g., user@example.com).",
 *       "suggestion": "Enter a valid email address like user@example.com"
 *     },
 *     {
 *       "field": "password",
 *       "code": "MIN_LENGTH",
 *       "message": "Password must be at least 8 characters long.",
 *       "suggestion": "Add more characters to meet the minimum length"
 *     },
 *     {
 *       "field": "confirmPassword",
 *       "code": "PASSWORD_MATCH",
 *       "message": "Passwords do not match. Please ensure both password fields are identical."
 *     }
 *   ],
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 */
