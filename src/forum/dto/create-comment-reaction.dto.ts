import { IsNotEmpty, IsString, Length, IsUUID } from 'class-validator';

export class CreateCommentReactionDto {
  @IsNotEmpty()
  @IsUUID()
  commentId: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 50)
  reactionType: string;
} 