import { PartialType } from '@nestjs/mapped-types';
import { CreateCertificateDto } from './create-certificate.dto';

/**
 * DTO for updating a certificate (partial fields allowed).
 */
export class UpdateCertificateDto extends PartialType(CreateCertificateDto) {}
