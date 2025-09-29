import { PartialType } from '@nestjs/swagger';
import { CreateCredentialDto } from './create-credential.dto';

/**
 * DTO for updating a credential (partial fields allowed).
 */
export class UpdateCredentialDto extends PartialType(CreateCredentialDto) {}
