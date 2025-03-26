import { PartialType } from '@nestjs/swagger';
import { CreateForumTopicDto } from './create-topic.dto';

export class UpdateTopicDto extends PartialType(CreateForumTopicDto) {}
