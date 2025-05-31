import { IsBoolean, IsNotEmpty, IsUUID } from 'class-validator';

export class CreatePostVoteDto {
  @IsNotEmpty()
  @IsUUID()
  postId: string;

  @IsBoolean()
  isUpvote: boolean; // Optional, if you implement downvotes
} 