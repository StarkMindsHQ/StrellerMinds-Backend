import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ContentStatus } from '../enums/content-status.enum'

export class ContentFilterDto {
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  authorId?: string;
}
