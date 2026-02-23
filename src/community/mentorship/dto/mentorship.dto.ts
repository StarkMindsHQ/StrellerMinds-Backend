import { IsString, IsArray, IsOptional, IsInt, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MentorshipType } from '../entities/mentorship.entity';

export class RegisterMentorDto {
  @ApiProperty()
  @IsString()
  bio: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  expertise: string[];

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  languages?: string[];

  @ApiProperty()
  @IsInt()
  @Min(0)
  yearsOfExperience: number;

  @ApiProperty({ default: 5 })
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  maxMentees?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  availability?: {
    days: string[];
    timeSlots: string[];
    timezone: string;
  };
}

export class RequestMentorshipDto {
  @ApiProperty()
  @IsString()
  mentorId: string;

  @ApiProperty({ enum: MentorshipType, default: 'one_on_one' })
  @IsEnum(MentorshipType)
  @IsOptional()
  type?: MentorshipType;

  @ApiProperty()
  @IsString()
  goals: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  focusAreas: string[];

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  targetSessions?: number;
}

export class LogSessionDto {
  @ApiProperty()
  @IsDateString()
  scheduledAt: string;

  @ApiProperty()
  @IsInt()
  @Min(15)
  durationMinutes: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  agenda?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  topics?: string[];
}

export class SubmitFeedbackDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}
