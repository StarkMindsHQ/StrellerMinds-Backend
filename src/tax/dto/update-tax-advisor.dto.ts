import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdateTaxAdvisorDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  licenseNumber?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  licenseExpiresAt?: Date;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  jurisdictions?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
