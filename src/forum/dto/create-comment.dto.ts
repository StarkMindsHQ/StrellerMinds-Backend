import { IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  contentMarkdown: string;

  @IsOptional()
  parentId?: string;
}
