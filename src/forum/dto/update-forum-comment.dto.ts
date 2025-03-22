import { PartialType } from '@nestjs/mapped-types';
import { CreateForumCommentDto } from './create-forum-comment.dto';

export class UpdateForumTopicDto extends PartialType(CreateForumCommentDto) {}
