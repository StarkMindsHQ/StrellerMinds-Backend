import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IEventStore } from '../interfaces/event-store.interface';
import { Inject } from '@nestjs/common';

export interface EventMetrics {
  totalEvents: number;
  eventsToday: number;
  eventsThisWeek: number;
  eventsThisMonth: number;
  eventsByType: Record<string, number>;
  eventsByAggregate: Record<string, number>;
  eventsPerHour: Array<{ hour: string; count: number }>;
  eventsPerDay: Array<{ date: string; count: number }>;
  topAggregates: Array<{ aggregateType: string; aggregateId: string; eventCount: number }>;
  recentEvents: Array<{
    eventId: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    timestamp: Date;
  }>;
}

export interface EventHealthMetrics {
  eventStoreHealth: {
    isHealthy: boolean;
    lastEventTimestamp?: Date;
    eventCount24h: number;
    averageEventsPerHour: number;
  };
  eventBusHealth: {
    isHealthy: boolean;
    publishedEvents24h: number;
    processedEvents24h: number;
    failedEvents24h: number;
    averageProcessingTime: number;
  };
  queueHealth: {
    isHealthy: boolean;
    pendingJobs: number;
    failedJobs: number;
    completedJobs24h: number;
  };
}

export interface EventTrend {
  period: string;
  eventCount: number;
  uniqueAggregates: number;
  eventTypes: string[];
  growthRate?: number;
}

@Injectable()
export class EventAnalyticsService {
  private readonly logger = new Logger(EventAnalyticsService.name);
  private cachedMetrics: EventMetrics | null = null;
  private lastMetricsUpdate: Date | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @Inject('EVENT_STORE') private readonly eventStore: IEventStore,
  ) {}

  async getEventMetrics(forceRefresh = false): Promise<EventMetrics> {
    if (!forceRefresh && this.isCacheValid()) {
      return this.cachedMetrics!;
    }

    try {
      this.logger.debug('Calculating event metrics');

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get all events for analysis
      const allEvents = await this.eventStore.getAllEvents();
      const eventsToday = allEvents.filter(e => e.timestamp >= today);
      const eventsThisWeek = allEvents.filter(e => e.timestamp >= thisWeek);
      const eventsThisMonth = allEvents.filter(e => e.timestamp >= thisMonth);

      // Calculate metrics
      const metrics: EventMetrics = {
        totalEvents: allEvents.length,
        eventsToday: eventsToday.length,
        eventsThisWeek: eventsThisWeek.length,
        eventsThisMonth: eventsThisMonth.length,
        eventsByType: this.calculateEventsByType(allEvents),
        eventsByAggregate: this.calculateEventsByAggregate(allEvents),
        eventsPerHour: this.calculateEventsPerHour(eventsToday),
        eventsPerDay: this.calculateEventsPerDay(eventsThisMonth),
        topAggregates: this.calculateTopAggregates(allEvents),
        recentEvents: this.getRecentEvents(allEvents, 10),
      };

      this.cachedMetrics = metrics;
      this.lastMetricsUpdate = new Date();

      this.logger.debug('Event metrics calculated successfully', {
        totalEvents: metrics.totalEvents,
        eventsToday: metrics.eventsToday,
      });

      return metrics;
    } catch (error) {
      this.logger.error('Failed to calculate event metrics', error.stack);
      throw error;
    }
  }

  async getEventHealthMetrics(): Promise<EventHealthMetrics> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get events from last 24 hours
      const recentEvents = await this.eventStore.queryEvents({
        fromTimestamp: yesterday,
        toTimestamp: now,
      });

      const lastEvent = recentEvents.length > 0 
        ? recentEvents[recentEvents.length - 1] 
        : null;

      return {
        eventStoreHealth: {
          isHealthy: recentEvents.length > 0,
          lastEventTimestamp: lastEvent?.timestamp,
          eventCount24h: recentEvents.length,
          averageEventsPerHour: recentEvents.length / 24,
        },
        eventBusHealth: {
          isHealthy: true, // This would come from EventBusService metrics
          publishedEvents24h: recentEvents.length,
          processedEvents24h: recentEvents.length,
          failedEvents24h: 0,
          averageProcessingTime: 0,
        },
        queueHealth: {
          isHealthy: true, // This would come from queue monitoring
          pendingJobs: 0,
          failedJobs: 0,
          completedJobs24h: recentEvents.length,
        },
      };
    } catch (error) {
      this.logger.error('Failed to calculate event health metrics', error.stack);
      throw error;
    }
  }

  async getEventTrends(days = 30): Promise<EventTrend[]> {
    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const events = await this.eventStore.queryEvents({
        fromTimestamp: startDate,
        toTimestamp: now,
      });

      const trends: EventTrend[] = [];
      
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        
        const dayEvents = events.filter(e => 
          e.timestamp >= date && e.timestamp < nextDate
        );

        const uniqueAggregates = new Set(
          dayEvents.map(e => `${e.aggregateType}:${e.aggregateId}`)
        ).size;

        const eventTypes = [...new Set(dayEvents.map(e => e.eventType))];

        trends.push({
          period: date.toISOString().split('T')[0],
          eventCount: dayEvents.length,
          uniqueAggregates,
          eventTypes,
        });
      }

      // Calculate growth rates
      for (let i = 1; i < trends.length; i++) {
        const current = trends[i].eventCount;
        const previous = trends[i - 1].eventCount;
        trends[i].growthRate = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      }

      return trends;
    } catch (error) {
      this.logger.error('Failed to calculate event trends', error.stack);
      throw error;
    }
  }

  async getEventsByAggregateType(aggregateType: string, limit = 100) {
    return this.eventStore.queryEvents({
      aggregateType,
      limit,
    });
  }

  async getEventsByType(eventType: string, limit = 100) {
    return this.eventStore.queryEvents({
      eventTypes: [eventType],
      limit,
    });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshMetricsCache(): Promise<void> {
    try {
      await this.getEventMetrics(true);
      this.logger.debug('Event metrics cache refreshed');
    } catch (error) {
      this.logger.error('Failed to refresh event metrics cache', error.stack);
    }
  }

  private isCacheValid(): boolean {
    return this.cachedMetrics !== null && 
           this.lastMetricsUpdate !== null && 
           (Date.now() - this.lastMetricsUpdate.getTime()) < this.CACHE_TTL;
  }

  private calculateEventsByType(events: any[]): Record<string, number> {
    const result: Record<string, number> = {};
    for (const event of events) {
      result[event.eventType] = (result[event.eventType] || 0) + 1;
    }
    return result;
  }

  private calculateEventsByAggregate(events: any[]): Record<string, number> {
    const result: Record<string, number> = {};
    for (const event of events) {
      result[event.aggregateType] = (result[event.aggregateType] || 0) + 1;
    }
    return result;
  }

  private calculateEventsPerHour(events: any[]): Array<{ hour: string; count: number }> {
    const hourCounts: Record<string, number> = {};
    
    for (const event of events) {
      const hour = event.timestamp.getHours().toString().padStart(2, '0');
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }

    return Array.from({ length: 24 }, (_, i) => ({
      hour: i.toString().padStart(2, '0'),
      count: hourCounts[i.toString().padStart(2, '0')] || 0,
    }));
  }

  private calculateEventsPerDay(events: any[]): Array<{ date: string; count: number }> {
    const dayCounts: Record<string, number> = {};
    
    for (const event of events) {
      const date = event.timestamp.toISOString().split('T')[0];
      dayCounts[date] = (dayCounts[date] || 0) + 1;
    }

    return Object.entries(dayCounts).map(([date, count]) => ({ date, count }));
  }

  private calculateTopAggregates(events: any[], limit = 10) {
    const aggregateCounts: Record<string, number> = {};
    
    for (const event of events) {
      const key = `${event.aggregateType}:${event.aggregateId}`;
      aggregateCounts[key] = (aggregateCounts[key] || 0) + 1;
    }

    return Object.entries(aggregateCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([key, count]) => {
        const [aggregateType, aggregateId] = key.split(':');
        return { aggregateType, aggregateId, eventCount: count };
      });
  }

  private getRecentEvents(events: any[], limit = 10) {
    return events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
      .map(event => ({
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        timestamp: event.timestamp,
      }));
  }
}
