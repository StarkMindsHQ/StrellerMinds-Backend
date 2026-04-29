import {
  IsBase64,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { TaxDocumentType } from '../enums/tax-document-type.enum';

export class UploadTaxDocumentDto {
  @IsEnum(TaxDocumentType)
  type: TaxDocumentType;

  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  filename: string;

  @IsString()
  @IsBase64()
  contentBase64: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  mimeType?: string;

  @IsUUID()
  ownerUserId: string;

  @IsOptional()
  @IsString()
  @Length(1, 128)
  propertyId?: string;
}
