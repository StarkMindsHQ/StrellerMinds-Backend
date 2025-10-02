import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EventAnalyticsService } from '../services/event-analytics.service';
import { EventBusService } from '../services/event-bus.service';
import { CqrsBusService } from '../../cqrs/services/cqrs-bus.service';

@ApiTags('Event Analytics')
@Controller('admin/events/analytics')
@ApiBearerAuth()
// @UseGuards(AdminGuard) // Uncomment when you have admin guard
export class EventAnalyticsController {
  constructor(
    private readonly eventAnalyticsService: EventAnalyticsService,
    private readonly eventBusService: EventBusService,
    private readonly cqrsBusService: CqrsBusService,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get comprehensive event metrics' })
  @ApiResponse({ status: 200, description: 'Event metrics retrieved successfully' })
  @ApiQuery({ name: 'refresh', required: false, type: Boolean })
  async getEventMetrics(@Query('refresh') refresh?: boolean) {
    return this.eventAnalyticsService.getEventMetrics(refresh === true);
  }

  @Get('health')
  @ApiOperation({ summary: 'Get event system health metrics' })
  @ApiResponse({ status: 200, description: 'Event health metrics retrieved successfully' })
  async getEventHealthMetrics() {
    return this.eventAnalyticsService.getEventHealthMetrics();
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get event trends over time' })
  @ApiResponse({ status: 200, description: 'Event trends retrieved successfully' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getEventTrends(@Query('days') days?: number) {
    return this.eventAnalyticsService.getEventTrends(days || 30);
  }

  @Get('bus-metrics')
  @ApiOperation({ summary: 'Get event bus performance metrics' })
  @ApiResponse({ status: 200, description: 'Event bus metrics retrieved successfully' })
  async getEventBusMetrics() {
    return this.eventBusService.getMetrics();
  }

  @Get('cqrs-metrics')
  @ApiOperation({ summary: 'Get CQRS bus performance metrics' })
  @ApiResponse({ status: 200, description: 'CQRS metrics retrieved successfully' })
  async getCqrsMetrics() {
    return this.cqrsBusService.getMetrics();
  }

  @Get('by-aggregate-type')
  @ApiOperation({ summary: 'Get events by aggregate type' })
  @ApiResponse({ status: 200, description: 'Events by aggregate type retrieved successfully' })
  @ApiQuery({ name: 'aggregateType', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getEventsByAggregateType(
    @Query('aggregateType') aggregateType: string,
    @Query('limit') limit?: number,
  ) {
    return this.eventAnalyticsService.getEventsByAggregateType(aggregateType, limit || 100);
  }

  @Get('by-type')
  @ApiOperation({ summary: 'Get events by event type' })
  @ApiResponse({ status: 200, description: 'Events by type retrieved successfully' })
  @ApiQuery({ name: 'eventType', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getEventsByType(@Query('eventType') eventType: string, @Query('limit') limit?: number) {
    return this.eventAnalyticsService.getEventsByType(eventType, limit || 100);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get comprehensive dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboardData() {
    const [metrics, health, trends, busMetrics, cqrsMetrics] = await Promise.all([
      this.eventAnalyticsService.getEventMetrics(),
      this.eventAnalyticsService.getEventHealthMetrics(),
      this.eventAnalyticsService.getEventTrends(7), // Last 7 days for dashboard
      this.eventBusService.getMetrics(),
      this.cqrsBusService.getMetrics(),
    ]);

    return {
      overview: {
        totalEvents: metrics.totalEvents,
        eventsToday: metrics.eventsToday,
        eventsThisWeek: metrics.eventsThisWeek,
        isHealthy: health.eventStoreHealth.isHealthy && health.eventBusHealth.isHealthy,
      },
      metrics,
      health,
      trends,
      performance: {
        eventBus: busMetrics,
        cqrs: cqrsMetrics,
      },
      charts: {
        eventsPerHour: metrics.eventsPerHour,
        eventsPerDay: metrics.eventsPerDay,
        eventsByType: Object.entries(metrics.eventsByType).map(([type, count]) => ({
          type,
          count,
        })),
        eventsByAggregate: Object.entries(metrics.eventsByAggregate).map(([aggregate, count]) => ({
          aggregate,
          count,
        })),
      },
    };
  }
}
