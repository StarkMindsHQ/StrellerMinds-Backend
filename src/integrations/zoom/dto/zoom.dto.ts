import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsArray } from 'class-validator';

export class ZoomConfigDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  clientSecret: string;

  @IsString()
  @IsOptional()
  webhookSecret?: string;

  @IsString()
  @IsOptional()
  webhookUrl?: string;
}

export class CreateMeetingDto {
  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsNumber()
  @IsOptional()
  meetingType?: number;

  @IsString()
  @IsOptional()
  timeZone?: string;

  @IsArray()
  @IsOptional()
  settings?: Record<string, any>;
}

export class MeetingResponseDto {
  id: string;
  uuid: string;
  meetingId: string;
  topic: string;
  startTime: string;
  duration: number;
  joinUrl: string;
  status: string;
}

export class RecordingDto {
  id: string;
  meetingId: string;
  recordingId: string;
  recordingName: string;
  recordingUrl: string;
  downloadUrl: string;
  recordingDate: string;
  fileSize: number;
  duration: number;
}

export class WebhookEventDto {
  @IsString()
  @IsNotEmpty()
  event: string;

  @IsString()
  @IsNotEmpty()
  eventTs: string;

  @IsString()
  @IsOptional()
  eventId?: string;

  @IsString()
  @IsOptional()
  payload?: any;
}
