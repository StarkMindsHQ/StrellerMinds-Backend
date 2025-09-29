import { Test, type TestingModule } from "@nestjs/testing"
import { jest } from "@jest/globals"

import { BusinessIntelligenceService, type AnalyticsQuery } from "../services/business-intelligence.service"
import { DataWarehouseService } from "../services/data-warehouse.service"
import { DataCollectionService } from "../services/data-collection.service"
import { MetricType } from "../entities/data-warehouse-metric.entity"

describe("BusinessIntelligenceService", () => {
  let service: BusinessIntelligenceService
  let dataWarehouseService: jest.Mocked<DataWarehouseService>
  let dataCollectionService: jest.Mocked<DataCollectionService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessIntelligenceService,
        {
          provide: DataWarehouseService,
          useValue: {
            getMetrics: jest.fn(),
          },
        },
        {
          provide: DataCollectionService,
          useValue: {
            getEvents: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<BusinessIntelligenceService>(BusinessIntelligenceService)
    dataWarehouseService = module.get(DataWarehouseService)
    dataCollectionService = module.get(DataCollectionService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("executeQuery", () => {
    it("should execute analytics query successfully", async () => {
      const query: AnalyticsQuery = {
        metrics: ["event_count", "active_users"],
        timeRange: {
          start: new Date("2023-01-01"),
          end: new Date("2023-01-02"),
        },
        granularity: "1h",
      }

      const mockMetrics = [
        {
          id: "1",
          metricName: "event_count",
          metricType: MetricType.COUNTER,
          value: 100,
          dimensions: { eventType: "user_action" },
          timestamp: new Date("2023-01-01T10:00:00Z"),
        },
        {
          id: "2",
          metricName: "active_users",
          metricType: MetricType.GAUGE,
          value: 50,
          dimensions: { eventType: "user_action" },
          timestamp: new Date("2023-01-01T10:00:00Z"),
        },
      ]

      dataWarehouseService.getMetrics.mockResolvedValue(mockMetrics)

      const result = await service.executeQuery(query)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].metrics).toEqual({
        event_count: 100,
        active_users: 50,
      })
      expect(result.summary.totalRecords).toBe(1)
      expect(result.summary.aggregations).toEqual({
        event_count_total: 100,
        event_count_avg: 100,
        active_users_total: 50,
        active_users_avg: 50,
      })
    })

    it("should handle empty results", async () => {
      const query: AnalyticsQuery = {
        metrics: ["event_count"],
        timeRange: {
          start: new Date("2023-01-01"),
          end: new Date("2023-01-02"),
        },
      }

      dataWarehouseService.getMetrics.mockResolvedValue([])

      const result = await service.executeQuery(query)

      expect(result.data).toHaveLength(0)
      expect(result.summary.totalRecords).toBe(0)
    })
  })

  describe("getUserAnalytics", () => {
    it("should return user analytics", async () => {
      const userId = "user123"
      const timeRange = {
        start: new Date("2023-01-01"),
        end: new Date("2023-01-02"),
      }

      const mockEvents = {
        events: [
          {
            id: "1",
            eventType: "user_action",
            sessionId: "session1",
            timestamp: new Date("2023-01-01T10:00:00Z"),
          },
          {
            id: "2",
            eventType: "system_event",
            sessionId: "session2",
            timestamp: new Date("2023-01-01T11:00:00Z"),
          },
        ],
        total: 2,
      }

      dataCollectionService.getEvents.mockResolvedValue(mockEvents as any)

      const result = await service.getUserAnalytics(userId, timeRange)

      expect(result.userId).toBe(userId)
      expect(result.totalEvents).toBe(2)
      expect(result.sessionCount).toBe(2)
      expect(result.eventsByType).toEqual({
        user_action: 1,
        system_event: 1,
      })
    })
  })
})
