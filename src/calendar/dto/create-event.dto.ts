import { IsString, IsOptional, IsBoolean, IsISO8601, IsIn } from 'class-validator';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsISO8601()
  start: string;

  @IsOptional()
  @IsISO8601()
  end?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsIn(['course', 'office', 'assignment', 'personal', 'generic'])
  eventType?: string;

  @IsOptional()
  @IsString()
  recurrenceRule?: string;
}
