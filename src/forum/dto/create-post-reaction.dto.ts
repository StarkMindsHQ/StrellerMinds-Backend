import { IsNotEmpty, IsString, Length, IsUUID } from 'class-validator';

export class CreatePostReactionDto {
  @IsNotEmpty()
  @IsUUID()
  postId: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 50)
  reactionType: string;
} 