import { PartialType } from '@nestjs/swagger';
import { ModerationActionDto } from './create-moderation-action.dto';

export class UpdateModerationDto extends PartialType(ModerationActionDto) {}
