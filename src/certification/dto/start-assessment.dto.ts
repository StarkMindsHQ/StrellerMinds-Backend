import { IsUUID } from 'class-validator';

export class StartAssessmentDto {
  @IsUUID()
  assessmentId: string;

  @IsUUID()
  userId: string;
}
