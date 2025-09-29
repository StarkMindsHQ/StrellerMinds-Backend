import { Controller, Post, Get, Query, Param, ValidationPipe, UsePipes } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger"

import type { DataCollectionService, EventData } from "../services/data-collection.service"
import type { BusinessIntelligenceService, AnalyticsQuery } from "../services/business-intelligence.service"
import type { RealTimeAnalyticsService } from "../services/real-time-analytics.service"

import type { TrackEventDto } from "../dto/track-event.dto"
import type { AnalyticsQueryDto } from "../dto/analytics-query.dto"

@ApiTags("Analytics")
@Controller("analytics")
export class AnalyticsController {
  constructor(
    private readonly dataCollectionService: DataCollectionService,
    private readonly businessIntelligenceService: BusinessIntelligenceService,
    private readonly realTimeAnalyticsService: RealTimeAnalyticsService,
  ) {}

  @Post("track")
  @ApiOperation({ summary: "Track a single analytics event" })
  @ApiResponse({ status: 201, description: "Event tracked successfully" })
  @UsePipes(new ValidationPipe({ transform: true }))
  async trackEvent(trackEventDto: TrackEventDto) {
    await this.dataCollectionService.trackEvent(trackEventDto as EventData)
    return { success: true, message: "Event tracked successfully" }
  }

  @Post("track/batch")
  @ApiOperation({ summary: "Track multiple analytics events" })
  @ApiResponse({ status: 201, description: "Events tracked successfully" })
  @UsePipes(new ValidationPipe({ transform: true }))
  async trackEvents(events: TrackEventDto[]) {
    await this.dataCollectionService.batchTrackEvents(events as EventData[])
    return { success: true, message: `${events.length} events tracked successfully` }
  }

  @Post("query")
  @ApiOperation({ summary: "Execute analytics query" })
  @ApiResponse({ status: 200, description: "Query executed successfully" })
  @UsePipes(new ValidationPipe({ transform: true }))
  async executeQuery(queryDto: AnalyticsQueryDto) {
    const result = await this.businessIntelligenceService.executeQuery(queryDto as AnalyticsQuery)
    return result
  }

  @Get("events")
  @ApiOperation({ summary: "Get analytics events with filters" })
  @ApiResponse({ status: 200, description: "Events retrieved successfully" })
  async getEvents(
    @Query('eventType') eventType?: string,
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const filters = {
      eventType: eventType as any,
      userId,
      sessionId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? Number.parseInt(limit.toString()) : undefined,
      offset: offset ? Number.parseInt(offset.toString()) : undefined,
    }

    return this.dataCollectionService.getEvents(filters)
  }

  @Get("user/:userId")
  @ApiOperation({ summary: "Get user analytics" })
  @ApiResponse({ status: 200, description: "User analytics retrieved successfully" })
  async getUserAnalytics(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const timeRange = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate) : new Date(),
    }

    return this.businessIntelligenceService.getUserAnalytics(userId, timeRange)
  }

  @Get("top/:metricName")
  @ApiOperation({ summary: "Get top metrics by dimension" })
  @ApiResponse({ status: 200, description: "Top metrics retrieved successfully" })
  async getTopMetrics(
    @Param('metricName') metricName: string,
    @Query('dimension') dimension: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
  ) {
    const timeRange = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate) : new Date(),
    }

    return this.businessIntelligenceService.getTopMetrics(
      metricName,
      dimension,
      timeRange,
      limit ? Number.parseInt(limit.toString()) : 10,
    )
  }

  @Post("funnel")
  @ApiOperation({ summary: "Get funnel analysis" })
  @ApiResponse({ status: 200, description: "Funnel analysis completed successfully" })
  async getFunnelAnalysis(body: { steps: string[]; startDate?: string; endDate?: string }) {
    const timeRange = {
      start: body.startDate ? new Date(body.startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: body.endDate ? new Date(body.endDate) : new Date(),
    }

    return this.businessIntelligenceService.getFunnelAnalysis(body.steps, timeRange)
  }

  @Get("real-time/metrics")
  @ApiOperation({ summary: "Get current real-time metrics" })
  @ApiResponse({ status: 200, description: "Real-time metrics retrieved successfully" })
  async getRealTimeMetrics() {
    const metrics = await this.realTimeAnalyticsService.getCurrentMetrics()
    const activeUsers = await this.realTimeAnalyticsService.getActiveUsers()
    const eventsPerSecond = await this.realTimeAnalyticsService.getEventsPerSecond()

    return {
      metrics,
      summary: {
        activeUsers,
        eventsPerSecond,
        timestamp: new Date(),
      },
    }
  }
}
