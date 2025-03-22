import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateForumPostDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsUUID()
  authorId: string;

  @IsUUID()
  topicId: string;
}
