import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
} from 'class-validator';

export class CreateTaxAdvisorDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 64)
  licenseNumber: string;

  @Type(() => Date)
  @IsDate()
  licenseExpiresAt: Date;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  jurisdictions: string[];
}
