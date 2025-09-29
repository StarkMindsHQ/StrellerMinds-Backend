import { PartialType } from '@nestjs/swagger';
import { ModerationActionDto } from './create-moderation-action.dto';

/**
 * DTO for updating a moderation action (partial fields allowed).
 */
export class UpdateModerationDto extends PartialType(ModerationActionDto) {}
