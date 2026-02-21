import { IsUUID, IsOptional, IsArray } from 'class-validator';

export class SubmitAnswerDto {
  @IsUUID()
  questionId: string;

  @IsOptional()
  answerText?: string;

  @IsOptional()
  @IsArray()
  selectedOptionIds?: string[];
}

export class SubmitAttemptDto {
  @IsUUID()
  attemptId: string;

  @IsOptional()
  @IsArray()
  answers?: SubmitAnswerDto[];

  @IsOptional()
  finished?: boolean;
}
