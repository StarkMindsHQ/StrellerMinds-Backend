import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EventReplayService, ReplayOptions, ReplayResult } from '../services/event-replay.service';

export class ReplayEventsDto {
  fromPosition?: number;
  toPosition?: number;
  fromTimestamp?: string;
  toTimestamp?: string;
  eventTypes?: string[];
  aggregateIds?: string[];
  aggregateTypes?: string[];
  batchSize?: number;
  delayBetweenBatches?: number;
  dryRun?: boolean;
  skipEventTypes?: string[];
}

export class ReplayAggregateDto {
  aggregateId: string;
  aggregateType: string;
  fromVersion?: number;
  dryRun?: boolean;
}

@ApiTags('Event Replay')
@Controller('admin/events/replay')
@ApiBearerAuth()
// @UseGuards(AdminGuard) // Uncomment when you have admin guard
export class EventReplayController {
  constructor(private readonly eventReplayService: EventReplayService) {}

  @Post()
  @ApiOperation({ summary: 'Replay events based on criteria' })
  @ApiResponse({ status: 200, description: 'Events replayed successfully' })
  async replayEvents(@Body() dto: ReplayEventsDto): Promise<ReplayResult> {
    const options: ReplayOptions = {
      ...dto,
      fromTimestamp: dto.fromTimestamp ? new Date(dto.fromTimestamp) : undefined,
      toTimestamp: dto.toTimestamp ? new Date(dto.toTimestamp) : undefined,
    };

    return this.eventReplayService.replayEvents(options);
  }

  @Post('aggregate')
  @ApiOperation({ summary: 'Replay events for a specific aggregate' })
  @ApiResponse({ status: 200, description: 'Aggregate events replayed successfully' })
  async replayAggregateEvents(@Body() dto: ReplayAggregateDto): Promise<ReplayResult> {
    return this.eventReplayService.replayAggregateEvents(
      dto.aggregateId,
      dto.aggregateType,
      dto.fromVersion,
      { dryRun: dto.dryRun },
    );
  }

  @Post('time-range')
  @ApiOperation({ summary: 'Replay events within a time range' })
  @ApiResponse({ status: 200, description: 'Time range events replayed successfully' })
  async replayEventsByTimeRange(
    @Body() dto: { fromTimestamp: string; toTimestamp: string; dryRun?: boolean },
  ): Promise<ReplayResult> {
    return this.eventReplayService.replayEventsByTimeRange(
      new Date(dto.fromTimestamp),
      new Date(dto.toTimestamp),
      { dryRun: dto.dryRun },
    );
  }

  @Post('by-type')
  @ApiOperation({ summary: 'Replay events by type' })
  @ApiResponse({ status: 200, description: 'Events by type replayed successfully' })
  async replayEventsByType(
    @Body() dto: { eventTypes: string[]; dryRun?: boolean },
  ): Promise<ReplayResult> {
    return this.eventReplayService.replayEventsByType(dto.eventTypes, { dryRun: dto.dryRun });
  }

  @Get('preview')
  @ApiOperation({ summary: 'Preview events that would be replayed' })
  @ApiResponse({ status: 200, description: 'Replay preview generated successfully' })
  async getReplayPreview(@Query() query: ReplayEventsDto) {
    const options: ReplayOptions = {
      ...query,
      fromTimestamp: query.fromTimestamp ? new Date(query.fromTimestamp) : undefined,
      toTimestamp: query.toTimestamp ? new Date(query.toTimestamp) : undefined,
    };

    return this.eventReplayService.getReplayPreview(options);
  }
}
