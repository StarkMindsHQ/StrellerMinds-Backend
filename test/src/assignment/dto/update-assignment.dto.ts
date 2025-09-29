import { PartialType } from '@nestjs/swagger';
import { CreateAssignmentDto } from './create-assignment.dto';

/**
 * DTO for updating an assignment (partial fields allowed).
 */
export class UpdateAssignmentDto extends PartialType(CreateAssignmentDto) {}
