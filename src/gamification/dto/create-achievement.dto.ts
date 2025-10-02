import { IsString, IsInt, Min, MaxLength } from 'class-validator';

export class CreateAchievementDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsInt()
  @Min(0)
  points: number;
}
