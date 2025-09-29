import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { Queue } from "bull"

import type { AnalyticsEvent, EventType } from "../entities/analytics-event.entity"
import type { RealTimeAnalyticsService } from "./real-time-analytics.service"

export interface EventData {
  eventType: EventType
  eventName: string
  userId?: string
  sessionId?: string
  properties: Record<string, any>
  context?: Record<string, any>
  source?: string
  channel?: string
}

@Injectable()
export class DataCollectionService {
  private readonly logger = new Logger(DataCollectionService.name)

  constructor(
    private readonly analyticsEventRepository: Repository<AnalyticsEvent>,
    private readonly dataCollectionQueue: Queue,
    private readonly realTimeAnalyticsService: RealTimeAnalyticsService,
  ) {}

  async trackEvent(eventData: EventData): Promise<void> {
    try {
      // Add to queue for async processing
      await this.dataCollectionQueue.add("process-event", {
        ...eventData,
        timestamp: new Date(),
      })

      // Send to real-time analytics
      await this.realTimeAnalyticsService.processRealTimeEvent(eventData)

      this.logger.log(`Event tracked: ${eventData.eventName}`)
    } catch (error) {
      this.logger.error(`Failed to track event: ${error.message}`, error.stack)
      throw error
    }
  }

  async batchTrackEvents(events: EventData[]): Promise<void> {
    try {
      const jobs = events.map((eventData) => ({
        name: "process-event",
        data: {
          ...eventData,
          timestamp: new Date(),
        },
      }))

      await this.dataCollectionQueue.addBulk(jobs)

      // Process real-time events
      await Promise.all(events.map((event) => this.realTimeAnalyticsService.processRealTimeEvent(event)))

      this.logger.log(`Batch tracked ${events.length} events`)
    } catch (error) {
      this.logger.error(`Failed to batch track events: ${error.message}`, error.stack)
      throw error
    }
  }

  async getEvents(filters: {
    eventType?: EventType
    userId?: string
    sessionId?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }): Promise<{ events: AnalyticsEvent[]; total: number }> {
    const query = this.analyticsEventRepository.createQueryBuilder("event")

    if (filters.eventType) {
      query.andWhere("event.eventType = :eventType", {
        eventType: filters.eventType,
      })
    }

    if (filters.userId) {
      query.andWhere("event.userId = :userId", { userId: filters.userId })
    }

    if (filters.sessionId) {
      query.andWhere("event.sessionId = :sessionId", {
        sessionId: filters.sessionId,
      })
    }

    if (filters.startDate) {
      query.andWhere("event.timestamp >= :startDate", {
        startDate: filters.startDate,
      })
    }

    if (filters.endDate) {
      query.andWhere("event.timestamp <= :endDate", {
        endDate: filters.endDate,
      })
    }

    query.orderBy("event.timestamp", "DESC")

    if (filters.limit) {
      query.limit(filters.limit)
    }

    if (filters.offset) {
      query.offset(filters.offset)
    }

    const [events, total] = await query.getManyAndCount()

    return { events, total }
  }
}
