import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class CreateForumTopicDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @IsUUID()
  categoryId: string;
}
