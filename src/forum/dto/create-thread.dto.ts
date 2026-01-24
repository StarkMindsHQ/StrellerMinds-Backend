import { IsString, MinLength } from 'class-validator';

export class CreateThreadDto {
  @IsString()
  @MinLength(5)
  title: string;

  @IsString()
  @MinLength(10)
  contentMarkdown: string;
}
