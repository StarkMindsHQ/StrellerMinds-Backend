import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateForumCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
