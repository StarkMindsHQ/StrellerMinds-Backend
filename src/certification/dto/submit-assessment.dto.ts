import { IsUUID, IsArray, IsObject } from 'class-validator';

export class SubmitAssessmentDto {
  @IsUUID()
  attemptId: string;

  @IsArray()
  answers: {
    questionId: string;
    answer: string | string[];
    timeSpent: number;
  }[];

  @IsObject()
  proctoring?: {
    violations?: string[];
    screenshots?: string[];
    webcamRecording?: string;
    screenRecording?: string;
  };
}
