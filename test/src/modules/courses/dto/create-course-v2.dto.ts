import { IsString, IsNumber, IsOptional, IsArray, IsEnum, IsBoolean, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum CourseDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

export class CreateCourseDtoV2 {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ enum: CourseDifficulty })
  @IsEnum(CourseDifficulty)
  difficulty: CourseDifficulty;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  requiresStellarWallet?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];
}

