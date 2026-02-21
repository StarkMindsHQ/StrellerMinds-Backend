import { IsString, IsUUID, IsOptional } from 'class-validator';

export class StartAttemptDto {
  @IsUUID()
  assessmentId: string;

  @IsOptional()
  @IsString()
  sessionToken?: string; // proctoring/session token if used
}
