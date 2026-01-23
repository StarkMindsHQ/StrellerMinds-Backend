import { PartialType } from '@nestjs/swagger';
import { CreateForumDto } from './create-comment.dto';

export class UpdateForumDto extends PartialType(CreateForumDto) {}
