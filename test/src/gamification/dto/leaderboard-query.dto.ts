import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';

export class LeaderboardQueryDto {
  @IsString()
  period: string; 

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
} 