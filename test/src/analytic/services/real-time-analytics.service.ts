import { Injectable, Logger } from "@nestjs/common"
import type { AnalyticsGateway } from "../gateways/analytics.gateway"
import type { EventData } from "./data-collection.service"

interface RealTimeMetric {
  name: string
  value: number
  timestamp: Date
  dimensions?: Record<string, string>
}

@Injectable()
export class RealTimeAnalyticsService {
  private readonly logger = new Logger(RealTimeAnalyticsService.name)
  private readonly metricsBuffer = new Map<string, RealTimeMetric>()
  private readonly bufferFlushInterval = 5000 // 5 seconds

  constructor(private readonly analyticsGateway: AnalyticsGateway) {
    // Flush metrics buffer periodically
    setInterval(() => {
      this.flushMetricsBuffer()
    }, this.bufferFlushInterval)
  }

  async processRealTimeEvent(eventData: EventData): Promise<void> {
    try {
      // Update real-time counters
      this.updateRealTimeCounters(eventData)

      // Emit to connected clients
      this.analyticsGateway.emitRealTimeEvent({
        type: "event",
        data: eventData,
        timestamp: new Date(),
      })

      this.logger.debug(`Processed real-time event: ${eventData.eventName}`)
    } catch (error) {
      this.logger.error(`Failed to process real-time event: ${error.message}`, error.stack)
    }
  }

  private updateRealTimeCounters(eventData: EventData): void {
    const timestamp = new Date()

    // Event count
    this.incrementMetric("events_per_second", 1, timestamp)

    // User activity
    if (eventData.userId) {
      this.incrementMetric("active_users", 1, timestamp, {
        userId: eventData.userId,
      })
    }

    // Event type counters
    this.incrementMetric(`events_${eventData.eventType}`, 1, timestamp)

    // Source/Channel counters
    if (eventData.source) {
      this.incrementMetric("events_by_source", 1, timestamp, {
        source: eventData.source,
      })
    }

    if (eventData.channel) {
      this.incrementMetric("events_by_channel", 1, timestamp, {
        channel: eventData.channel,
      })
    }
  }

  private incrementMetric(name: string, value: number, timestamp: Date, dimensions?: Record<string, string>): void {
    const key = `${name}_${JSON.stringify(dimensions || {})}`
    const existing = this.metricsBuffer.get(key)

    if (existing) {
      existing.value += value
      existing.timestamp = timestamp
    } else {
      this.metricsBuffer.set(key, {
        name,
        value,
        timestamp,
        dimensions,
      })
    }
  }

  private flushMetricsBuffer(): void {
    if (this.metricsBuffer.size === 0) {
      return
    }

    const metrics = Array.from(this.metricsBuffer.values())
    this.metricsBuffer.clear()

    // Emit aggregated metrics
    this.analyticsGateway.emitRealTimeMetrics(metrics)

    this.logger.debug(`Flushed ${metrics.length} real-time metrics`)
  }

  async getCurrentMetrics(): Promise<RealTimeMetric[]> {
    return Array.from(this.metricsBuffer.values())
  }

  async getActiveUsers(): Promise<number> {
    const activeUserMetrics = Array.from(this.metricsBuffer.values()).filter((metric) => metric.name === "active_users")

    return new Set(activeUserMetrics.map((metric) => metric.dimensions?.userId).filter(Boolean)).size
  }

  async getEventsPerSecond(): Promise<number> {
    const eventsMetric = this.metricsBuffer.get("events_per_second_{}")
    return eventsMetric?.value || 0
  }
}
