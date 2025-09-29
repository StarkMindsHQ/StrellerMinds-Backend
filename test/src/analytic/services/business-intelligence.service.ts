import { Injectable, Logger } from "@nestjs/common"
import type { DataWarehouseService } from "./data-warehouse.service"
import type { DataCollectionService } from "./data-collection.service"

export interface AnalyticsQuery {
  metrics: string[]
  dimensions?: string[]
  filters?: Record<string, any>
  timeRange: {
    start: Date
    end: Date
  }
  granularity?: string
  limit?: number
}

export interface AnalyticsResult {
  data: Array<{
    timestamp: Date
    dimensions: Record<string, string>
    metrics: Record<string, number>
  }>
  summary: {
    totalRecords: number
    timeRange: {
      start: Date
      end: Date
    }
    aggregations: Record<string, number>
  }
}

@Injectable()
export class BusinessIntelligenceService {
  private readonly logger = new Logger(BusinessIntelligenceService.name)

  constructor(
    private readonly dataWarehouseService: DataWarehouseService,
    private readonly dataCollectionService: DataCollectionService,
  ) {}

  async executeQuery(query: AnalyticsQuery): Promise<AnalyticsResult> {
    try {
      const results: AnalyticsResult = {
        data: [],
        summary: {
          totalRecords: 0,
          timeRange: query.timeRange,
          aggregations: {},
        },
      }

      // Get metrics data
      for (const metricName of query.metrics) {
        const metrics = await this.dataWarehouseService.getMetrics({
          metricName,
          startDate: query.timeRange.start,
          endDate: query.timeRange.end,
          granularity: query.granularity,
          limit: query.limit,
        })

        // Process and combine results
        for (const metric of metrics) {
          const existingDataPoint = results.data.find((dp) => dp.timestamp.getTime() === metric.timestamp.getTime())

          if (existingDataPoint) {
            existingDataPoint.metrics[metricName] = metric.value
          } else {
            results.data.push({
              timestamp: metric.timestamp,
              dimensions: metric.dimensions,
              metrics: { [metricName]: metric.value },
            })
          }
        }

        // Calculate aggregations
        const totalValue = metrics.reduce((sum, m) => sum + m.value, 0)
        results.summary.aggregations[`${metricName}_total`] = totalValue
        results.summary.aggregations[`${metricName}_avg`] = metrics.length > 0 ? totalValue / metrics.length : 0
      }

      results.summary.totalRecords = results.data.length

      // Sort by timestamp
      results.data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

      return results
    } catch (error) {
      this.logger.error(`Failed to execute analytics query: ${error.message}`, error.stack)
      throw error
    }
  }

  async getUserAnalytics(userId: string, timeRange: { start: Date; end: Date }) {
    const events = await this.dataCollectionService.getEvents({
      userId,
      startDate: timeRange.start,
      endDate: timeRange.end,
    })

    const sessionCount = new Set(events.events.map((e) => e.sessionId).filter(Boolean)).size

    const eventsByType = events.events.reduce(
      (acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      userId,
      timeRange,
      totalEvents: events.total,
      sessionCount,
      eventsByType,
      firstEvent: events.events[events.events.length - 1]?.timestamp,
      lastEvent: events.events[0]?.timestamp,
    }
  }

  async getTopMetrics(metricName: string, dimension: string, timeRange: { start: Date; end: Date }, limit = 10) {
    const metrics = await this.dataWarehouseService.getMetrics({
      metricName,
      startDate: timeRange.start,
      endDate: timeRange.end,
    })

    const aggregated = metrics.reduce(
      (acc, metric) => {
        const dimensionValue = metric.dimensions[dimension]
        if (dimensionValue) {
          acc[dimensionValue] = (acc[dimensionValue] || 0) + metric.value
        }
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(aggregated)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([name, value]) => ({ name, value }))
  }

  async getFunnelAnalysis(steps: string[], timeRange: { start: Date; end: Date }) {
    const funnelData = []

    for (let i = 0; i < steps.length; i++) {
      const stepEvents = await this.dataCollectionService.getEvents({
        startDate: timeRange.start,
        endDate: timeRange.end,
      })

      const stepCount = stepEvents.events.filter((event) => event.eventName === steps[i]).length

      const conversionRate = i === 0 ? 100 : (stepCount / funnelData[0].count) * 100

      funnelData.push({
        step: steps[i],
        count: stepCount,
        conversionRate,
        dropOffRate: i === 0 ? 0 : 100 - conversionRate,
      })
    }

    return funnelData
  }
}
