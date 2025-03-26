import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateForumTopicDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsUUID() // Ensures userId is a valid UUID
  @IsNotEmpty()
  userId: string; // <-- Ensure this is defined

  @IsUUID() // Ensures categoryId is a valid UUID
  @IsNotEmpty()
  categoryId: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}
