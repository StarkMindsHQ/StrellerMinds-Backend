import { IsUUID, IsOptional, IsBoolean } from 'class-validator';

export class UpdateProgressDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  courseId: string;

  @IsUUID()
  lessonId: string;

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;
}