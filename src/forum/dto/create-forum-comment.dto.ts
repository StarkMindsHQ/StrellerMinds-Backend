import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateForumCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsUUID()
  authorId: string;

  @IsUUID()
  postId: string;
}
