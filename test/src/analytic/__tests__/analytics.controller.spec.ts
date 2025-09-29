import { Test, type TestingModule } from "@nestjs/testing"
import { jest } from "@jest/globals"

import { AnalyticsController } from "../controllers/analytics.controller"
import { DataCollectionService } from "../services/data-collection.service"
import { BusinessIntelligenceService } from "../services/business-intelligence.service"
import { RealTimeAnalyticsService } from "../services/real-time-analytics.service"
import { EventType } from "../entities/analytics-event.entity"

describe("AnalyticsController", () => {
  let controller: AnalyticsController
  let dataCollectionService: jest.Mocked<DataCollectionService>
  let businessIntelligenceService: jest.Mocked<BusinessIntelligenceService>
  let realTimeAnalyticsService: jest.Mocked<RealTimeAnalyticsService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: DataCollectionService,
          useValue: {
            trackEvent: jest.fn(),
            batchTrackEvents: jest.fn(),
            getEvents: jest.fn(),
          },
        },
        {
          provide: BusinessIntelligenceService,
          useValue: {
            executeQuery: jest.fn(),
            getUserAnalytics: jest.fn(),
            getTopMetrics: jest.fn(),
            getFunnelAnalysis: jest.fn(),
          },
        },
        {
          provide: RealTimeAnalyticsService,
          useValue: {
            getCurrentMetrics: jest.fn(),
            getActiveUsers: jest.fn(),
            getEventsPerSecond: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<AnalyticsController>(AnalyticsController)
    dataCollectionService = module.get(DataCollectionService)
    businessIntelligenceService = module.get(BusinessIntelligenceService)
    realTimeAnalyticsService = module.get(RealTimeAnalyticsService)
  })

  it("should be defined", () => {
    expect(controller).toBeDefined()
  })

  describe("trackEvent", () => {
    it("should track an event successfully", async () => {
      const trackEventDto = {
        eventType: EventType.USER_ACTION,
        eventName: "button_click",
        userId: "user123",
        properties: { button: "submit" },
      }

      dataCollectionService.trackEvent.mockResolvedValue()

      const result = await controller.trackEvent(trackEventDto)

      expect(result).toEqual({
        success: true,
        message: "Event tracked successfully",
      })
      expect(dataCollectionService.trackEvent).toHaveBeenCalledWith(trackEventDto)
    })
  })

  describe("executeQuery", () => {
    it("should execute analytics query", async () => {
      const queryDto = {
        metrics: ["event_count"],
        timeRange: {
          start: "2023-01-01T00:00:00Z",
          end: "2023-01-02T00:00:00Z",
        },
      }

      const mockResult = {
        data: [],
        summary: {
          totalRecords: 0,
          timeRange: {
            start: new Date("2023-01-01"),
            end: new Date("2023-01-02"),
          },
          aggregations: {},
        },
      }

      businessIntelligenceService.executeQuery.mockResolvedValue(mockResult)

      const result = await controller.executeQuery(queryDto)

      expect(result).toEqual(mockResult)
      expect(businessIntelligenceService.executeQuery).toHaveBeenCalledWith(queryDto)
    })
  })

  describe("getRealTimeMetrics", () => {
    it("should return real-time metrics", async () => {
      const mockMetrics = [
        {
          name: "events_per_second",
          value: 10,
          timestamp: new Date(),
        },
      ]

      realTimeAnalyticsService.getCurrentMetrics.mockResolvedValue(mockMetrics)
      realTimeAnalyticsService.getActiveUsers.mockResolvedValue(5)
      realTimeAnalyticsService.getEventsPerSecond.mockResolvedValue(10)

      const result = await controller.getRealTimeMetrics()

      expect(result.metrics).toEqual(mockMetrics)
      expect(result.summary.activeUsers).toBe(5)
      expect(result.summary.eventsPerSecond).toBe(10)
    })
  })
})
