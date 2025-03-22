import { PartialType } from '@nestjs/mapped-types';
import { CreateForumCategoryDto } from './create-forum-category.dto';

export class UpdateForumTopicDto extends PartialType(CreateForumCategoryDto) {}
