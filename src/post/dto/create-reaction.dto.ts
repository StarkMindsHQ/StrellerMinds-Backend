import { IsString, IsNotEmpty } from 'class-validator';

export class CreateReactionDto {
  @IsString()
  @IsNotEmpty()
  type: string; // Example: 'like' or 'dislike'
}
