import { IsUUID, IsOptional } from "class-validator"

export class PredictCompletionDto {
  @IsUUID()
  userId: string

  @IsUUID()
  courseId: string

  @IsOptional()
  currentProgress?: number // Percentage (0-100)

  @IsOptional()
  timeSpent?: number // In minutes
}
