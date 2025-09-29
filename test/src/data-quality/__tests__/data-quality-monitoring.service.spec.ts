import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import { getQueueToken } from "@nestjs/bull"
import { EventEmitter2 } from "@nestjs/event-emitter"
import type { Repository } from "typeorm"
import type { Queue } from "bull"
import { jest } from "@jest/globals"

import { DataQualityMonitoringService } from "../services/data-quality-monitoring.service"
import { DataQualityMetric } from "../entities/data-quality-metric.entity"
import { DataQualityIssue } from "../entities/data-quality-issue.entity"

describe("DataQualityMonitoringService", () => {
  let service: DataQualityMonitoringService
  let metricRepository: Repository<DataQualityMetric>
  let issueRepository: Repository<DataQualityIssue>
  let eventEmitter: EventEmitter2
  let monitoringQueue: Queue

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
    getMany: jest.fn(),
    getCount: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataQualityMonitoringService,
        {
          provide: getRepositoryToken(DataQualityMetric),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            count: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DataQualityIssue),
          useValue: {
            count: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: getQueueToken("data-quality-monitoring"),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<DataQualityMonitoringService>(DataQualityMonitoringService)
    metricRepository = module.get<Repository<DataQualityMetric>>(getRepositoryToken(DataQualityMetric))
    issueRepository = module.get<Repository<DataQualityIssue>>(getRepositoryToken(DataQualityIssue))
    eventEmitter = module.get<EventEmitter2>(EventEmitter2)
    monitoringQueue = module.get<Queue>(getQueueToken("data-quality-monitoring"))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("getDashboard", () => {
    it("should return dashboard data", async () => {
      // Mock overall score calculation
      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ avgScore: "85.5" })

      // Mock category scores
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([
        { category: "completeness", avgScore: "90.0" },
        { category: "accuracy", avgScore: "80.0" },
      ])

      // Mock trend data
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([
        { date: "2024-01-01", category: "completeness", score: "88.0" },
        { date: "2024-01-02", category: "completeness", score: "92.0" },
      ])

      // Mock issue counts
      jest.spyOn(issueRepository, "count")
        .mockResolvedValueOnce(5) // active issues
        .mockResolvedValueOnce(2) // critical issues

      // Mock recent issues
      jest.spyOn(issueRepository, "find").mockResolvedValueOnce([
        {
          id: "issue1",
          title: "Test Issue",
          description: "Test description",
          priority: "high",
          status: "open",
          createdAt: new Date(),
        } as any,
      ])

      // Mock entity counts
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([
        { entityType: "user", count: "100" },
        { entityType: "course", count: "50" },
      ])

      // Mock performance metrics
      mockQueryBuilder.getCount.mockResolvedValueOnce(25)
      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ successRate: "0.95" })

      const result = await service.getDashboard("user")

      expect(result).toHaveProperty("overallScore", 85.5)
      expect(result).toHaveProperty("categoryScores")
      expect(result.categoryScores).toHaveProperty("completeness", 90)
      expect(result.categoryScores).toHaveProperty("accuracy", 80)
      expect(result).toHaveProperty("trendData")
      expect(result.trendData).toHaveLength(2)
      expect(result).toHaveProperty("activeIssues", 5)
      expect(result).toHaveProperty("criticalIssues", 2)
      expect(result).toHaveProperty("recentIssues")
      expect(result.recentIssues).toHaveLength(1)
      expect(result).toHaveProperty("healthStatus")
      expect(result).toHaveProperty("lastUpdated")
      expect(result).toHaveProperty("entityCounts")
      expect(result).toHaveProperty("performanceMetrics")
    })

    it("should calculate health status correctly", async () => {
      // Mock for critical health status
      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ avgScore: "50.0" })
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([]) // category scores
        .mockResolvedValueOnce([]) // trend data
        .mockResolvedValueOnce([]) // entity counts

      jest.spyOn(issueRepository, "count")
        .mockResolvedValueOnce(0) // active issues
        .mockResolvedValueOnce(1) // critical issues

      jest.spyOn(issueRepository, "find").mockResolvedValueOnce([])

      mockQueryBuilder.getCount.mockResolvedValueOnce(0)
      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ successRate: "0.5" })

      const result = await service.getDashboard()

      expect(result.healthStatus).toBe("critical")
    })
  })

  describe("getRealTimeMetrics", () => {
    it("should return real-time metrics", async () => {
      // Mock current score
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ avgScore: "85.0" }) // current score
        .mockResolvedValueOnce({ avgScore: "80.0" }) // previous score
        .mockResolvedValueOnce({ failureRate: "0.1" }) // failure rate
        .mockResolvedValueOnce({ lastCheck: new Date() }) // last check

      // Mock active checks count
      jest.spyOn(metricRepository, "count").mockResolvedValueOnce(5)

      const result = await service.getRealTimeMetrics("user")

      expect(result).toHaveProperty("currentScore", 85)
      expect(result).toHaveProperty("trend", "improving")
      expect(result).toHaveProperty("activeChecks", 5)
      expect(result).toHaveProperty("failureRate", 10)
      expect(result).toHaveProperty("lastCheckTime")
    })

    it("should calculate trend correctly", async () => {
      // Test declining trend
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ avgScore: "70.0" }) // current score
        .mockResolvedValueOnce({ avgScore: "85.0" }) // previous score (higher)
        .mockResolvedValueOnce({ failureRate: "0.2" })
        .mockResolvedValueOnce({ lastCheck: new Date() })

      jest.spyOn(metricRepository, "count").mockResolvedValueOnce(3)

      const result = await service.getRealTimeMetrics("user")

      expect(result.trend).toBe("declining")
    })

    it("should calculate stable trend for small differences", async () => {
      // Test stable trend
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ avgScore: "82.0" }) // current score
        .mockResolvedValueOnce({ avgScore: "80.0" }) // previous score (small diff)
        .mockResolvedValueOnce({ failureRate: "0.05" })
        .mockResolvedValueOnce({ lastCheck: new Date() })

      jest.spyOn(metricRepository, "count").mockResolvedValueOnce(2)

      const result = await service.getRealTimeMetrics("user")

      expect(result.trend).toBe("stable")
    })
  })

  describe("getQualityAlerts", () => {
    it("should return quality alerts", async () => {
      const mockIssues = [
        {
          id: "issue1",
          priority: "critical",
          description: "Critical data quality issue",
          createdAt: new Date(),
          entityType: "user",
        },
      ]

      const mockMetrics = [
        {
          id: "metric1",
          metricName: "completeness_check",
          value: 60,
          threshold: 80,
          timestamp: new Date(),
          entityType: "user",
        },
      ]

      jest.spyOn(issueRepository, "find").mockResolvedValueOnce(mockIssues as any)
      jest.spyOn(metricRepository, "find").mockResolvedValueOnce(mockMetrics as any)

      const result = await service.getQualityAlerts("user")

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty("type", "quality_issue")
      expect(result[1]).toHaveProperty("type", "threshold_breach")
    })
  })

  describe("getMetricHistory", () => {
    it("should return metric history", async () => {
      const mockMetrics = [
        {
          timestamp: new Date("2024-01-01"),
          value: 85,
          passed: true,
        },
        {
          timestamp: new Date("2024-01-02"),
          value: 90,
          passed: true,
        },
      ]

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockMetrics)

      const result = await service.getMetricHistory("completeness_check", "user", 7)

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty("timestamp")
      expect(result[0]).toHaveProperty("value", 85)
      expect(result[0]).toHaveProperty("passed", true)
    })
  })

  describe("acknowledgeAlert", () => {
    it("should emit acknowledgment event", async () => {
      const alertId = "alert123"
      const acknowledgedBy = "user123"

      await service.acknowledgeAlert(alertId, acknowledgedBy)

      expect(eventEmitter.emit).toHaveBeenCalledWith("alert.acknowledged", {
        alertId,
        acknowledgedBy,
        timestamp: expect.any(Date),
      })
    })
  })

  describe("scheduleQualityCheck", () => {
    it("should schedule quality check job", async () => {
      const entityType = "user"
      const delay = 5000

      await service.scheduleQualityCheck(entityType, delay)

      expect(monitoringQueue.add).toHaveBeenCalledWith(
        "quality-check",
        { entityType },
        { delay }
      )
    })
  })

  describe("performRealTimeMonitoring", () => {
    it("should perform real-time monitoring and emit events", async () => {
      // Mock unique entity types
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([
        { entityType: "user" },
        { entityType: "course" },
      ])

      // Mock real-time metrics for each entity type
      const mockMetrics = {
        currentScore: 85,
        trend: "improving" as const,
        activeChecks: 5,
        failureRate: 10,
        lastCheckTime: new Date(),
      }

      // Mock the getRealTimeMetrics calls
      jest.spyOn(service, "getRealTimeMetrics")
        .mockResolvedValueOnce(mockMetrics)
        .mockResolvedValueOnce(mockMetrics)

      await service.performRealTimeMonitoring()

      expect(eventEmitter.emit).toHaveBeenCalledWith("metrics.realtime", {
        entityType: "user",
        metrics: mockMetrics,
        timestamp: expect.any(Date),
      })

      expect(eventEmitter.emit).toHaveBeenCalledWith("metrics.realtime", {
        entityType: "course",
        metrics: mockMetrics,
        timestamp: expect.any(Date),
      })
    })

    it("should emit critical alerts for high failure rate", async () => {
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([{ entityType: "user" }])

      const mockMetrics = {
        currentScore: 85,
        trend: "stable" as const,
        activeChecks: 5,
        failureRate: 60, // High failure rate
        lastCheckTime: new Date(),
      }

      jest.spyOn(service, "getRealTimeMetrics").mockResolvedValueOnce(mockMetrics)

      await service.performRealTimeMonitoring()

      expect(eventEmitter.emit).toHaveBeenCalledWith("alert.critical", {
        type: "high_failure_rate",
        entityType: "user",
        failureRate: 60,
        timestamp: expect.any(Date),
      })
    })

    it("should emit critical alerts for low quality score", async () => {
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([{ entityType: "user" }])

      const mockMetrics = {
        currentScore: 50, // Low score
        trend: "declining" as const,
        activeChecks: 5,
        failureRate: 20,
        lastCheckTime: new Date(),
      }

      jest.spyOn(service, "getRealTimeMetrics").mockResolvedValueOnce(mockMetrics)

      await service.performRealTimeMonitoring()

      expect(eventEmitter.emit).toHaveBeenCalledWith("alert.critical", {
        type: "low_quality_score",
        entityType: "user",
        score: 50,
        timestamp: expect.any(Date),
      })
    })
  })

  describe("monitorQualityThresholds", () => {
    it("should log warnings for threshold breaches", async () => {
      const mockMetrics = [
        {
          metricName: "completeness_check",
          value: 60,
          threshold: 80,
        },
        {
          metricName: "accuracy_check",
          value: 90,
          threshold: 85,
        },
      ]

      jest.spyOn(metricRepository, "find").mockResolvedValueOnce(mockMetrics as any)
      const loggerSpy = jest.spyOn(service["logger"], "warn")

      await service.monitorQualityThresholds()

      expect(loggerSpy).toHaveBeenCalledWith(
        "Quality threshold breach: completeness_check = 60 (threshold: 80)"
      )
      expect(loggerSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("accuracy_check")
      )
    })
  })
})
