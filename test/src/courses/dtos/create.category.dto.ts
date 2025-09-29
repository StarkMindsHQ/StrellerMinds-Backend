import { IsNotEmpty, IsString } from "class-validator";
import { IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}