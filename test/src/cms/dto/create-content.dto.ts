import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateContentDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  category?: string;
}
