import { IsUUID, IsArray, ArrayMinSize, IsBoolean } from 'class-validator';

export class UpdateMultipleProgressDto {
  @IsUUID()
  courseId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("all", { each: true })
  lessonIds: string[];

  @IsBoolean()
  isCompleted: boolean;
}