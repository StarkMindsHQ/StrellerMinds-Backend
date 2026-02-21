import { IsEnum, IsArray, IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ScheduleFrequency, ExportFormat } from '../entities/report-schedule.entity';

export class ScheduleReportDto {
  @ApiProperty()
  @IsString()
  templateId: string;

  @ApiProperty({ enum: ScheduleFrequency })
  @IsEnum(ScheduleFrequency)
  frequency: ScheduleFrequency;

  @ApiProperty()
  @IsArray()
  @IsEmail({}, { each: true })
  recipients: string[];

  @ApiProperty({ enum: ExportFormat })
  @IsEnum(ExportFormat)
  format: ExportFormat;
}