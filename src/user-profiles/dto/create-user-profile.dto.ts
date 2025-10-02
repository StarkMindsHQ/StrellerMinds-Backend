import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsUrl,
  IsPhoneNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserProfileDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiProperty({ required: false })
  @IsUrl()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ required: false })
  @IsPhoneNumber()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
