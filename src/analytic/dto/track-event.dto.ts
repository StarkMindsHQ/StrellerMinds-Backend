import { IsEnum, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EventType } from '../entities/analytics-event.entity';

export class TrackEventDto {
  @ApiProperty({ enum: EventType, description: 'Type of the event' })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiProperty({ description: 'Name of the event' })
  @IsString()
  eventName: string;

  @ApiProperty({ description: 'User ID associated with the event', required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Session ID associated with the event', required: false })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ description: 'Event properties', type: 'object' })
  @IsObject()
  properties: Record<string, any>;

  @ApiProperty({ description: 'Event context', type: 'object', required: false })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiProperty({ description: 'Event source', required: false })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ description: 'Event channel', required: false })
  @IsOptional()
  @IsString()
  channel?: string;
}
