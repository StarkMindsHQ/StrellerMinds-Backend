import { IsInt, IsBoolean, Min, Max, IsOptional } from 'class-validator';

export class ProgressDto {
  @IsInt()
  achievementId: number;

  @IsBoolean()
  unlocked: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;
} 