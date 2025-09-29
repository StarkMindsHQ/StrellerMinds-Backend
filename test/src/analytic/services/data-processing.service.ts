import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import { Cron, CronExpression } from "@nestjs/schedule"

import type { AnalyticsEvent } from "../entities/analytics-event.entity"
import type { DataWarehouseService } from "./data-warehouse.service"

@Injectable()
export class DataProcessingService {
  private readonly logger = new Logger(DataProcessingService.name)

  constructor(
    private readonly analyticsEventRepository: Repository<AnalyticsEvent>,
    private readonly dataWarehouseService: DataWarehouseService,
  ) {}

  async processEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Save raw event
      await this.analyticsEventRepository.save(event)

      // Extract metrics for data warehouse
      await this.extractMetrics(event)

      this.logger.log(`Processed event: ${event.eventName}`)
    } catch (error) {
      this.logger.error(`Failed to process event: ${error.message}`, error.stack)
      throw error
    }
  }

  private async extractMetrics(event: AnalyticsEvent): Promise<void> {
    const timestamp = event.timestamp
    const dimensions = {
      eventType: event.eventType,
      eventName: event.eventName,
      source: event.source || "unknown",
      channel: event.channel || "unknown",
    }

    // Event count metric
    await this.dataWarehouseService.recordMetric({
      metricName: "event_count",
      metricType: "counter",
      value: 1,
      dimensions,
      timestamp,
    })

    // User activity metrics
    if (event.userId) {
      await this.dataWarehouseService.recordMetric({
        metricName: "active_users",
        metricType: "gauge",
        value: 1,
        dimensions: { ...dimensions, userId: event.userId },
        timestamp,
      })
    }

    // Session metrics
    if (event.sessionId) {
      await this.dataWarehouseService.recordMetric({
        metricName: "active_sessions",
        metricType: "gauge",
        value: 1,
        dimensions: { ...dimensions, sessionId: event.sessionId },
        timestamp,
      })
    }

    // Custom property metrics
    if (event.properties) {
      for (const [key, value] of Object.entries(event.properties)) {
        if (typeof value === "number") {
          await this.dataWarehouseService.recordMetric({
            metricName: `property_${key}`,
            metricType: "gauge",
            value,
            dimensions: { ...dimensions, property: key },
            timestamp,
          })
        }
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async aggregateHourlyMetrics(): Promise<void> {
    this.logger.log("Starting hourly metrics aggregation")

    try {
      const endTime = new Date()
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000) // 1 hour ago

      await this.dataWarehouseService.aggregateMetrics(startTime, endTime, "1h")

      this.logger.log("Completed hourly metrics aggregation")
    } catch (error) {
      this.logger.error(`Hourly aggregation failed: ${error.message}`, error.stack)
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateDailyMetrics(): Promise<void> {
    this.logger.log("Starting daily metrics aggregation")

    try {
      const endTime = new Date()
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000) // 1 day ago

      await this.dataWarehouseService.aggregateMetrics(startTime, endTime, "1d")

      this.logger.log("Completed daily metrics aggregation")
    } catch (error) {
      this.logger.error(`Daily aggregation failed: ${error.message}`, error.stack)
    }
  }
}
