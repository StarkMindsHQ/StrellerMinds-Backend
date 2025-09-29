import { IsString, IsInt, Min, MaxLength } from 'class-validator';

export class CreateRewardDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsString()
  type: string;

  @IsInt()
  @Min(0)
  value: number;
} 