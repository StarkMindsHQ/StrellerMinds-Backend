import { IsString, IsOptional, IsNumber, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetRecommendationsDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ required: false, default: 5 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  interests?: string[];
}

export class TutoringQueryDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ description: 'The ID of the learning node or course context' })
  @IsString()
  contextId: string;

  @ApiProperty()
  @IsString()
  query: string;
}