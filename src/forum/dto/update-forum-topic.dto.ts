import { PartialType } from '@nestjs/mapped-types';
import { CreateForumTopicDto } from './create-forum-topic.dto';

export class UpdateForumTopicDto extends PartialType(CreateForumTopicDto) {}
