import { IsBoolean, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateCommentVoteDto {
  @IsNotEmpty()
  @IsUUID()
  commentId: string;

  @IsBoolean()
  isUpvote: boolean;
} 