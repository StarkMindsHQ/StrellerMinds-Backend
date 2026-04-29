import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { TaxDocumentType } from '../enums/tax-document-type.enum';
import { TaxDocumentStatus } from '../enums/tax-document-status.enum';

export class ListTaxDocumentsDto {
  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 128)
  propertyId?: string;

  @IsOptional()
  @IsEnum(TaxDocumentType)
  type?: TaxDocumentType;

  @IsOptional()
  @IsEnum(TaxDocumentStatus)
  status?: TaxDocumentStatus;
}
