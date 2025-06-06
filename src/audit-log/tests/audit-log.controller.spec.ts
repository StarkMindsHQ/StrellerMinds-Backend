import { Test, type TestingModule } from "@nestjs/testing"
import { AuditLogController } from "../controllers/audit-log.controller"
import { AuditLogService } from "../services/audit-log.service"
import { AuditLogRetentionService } from "../services/audit-log-retention.service"
import { AuditLogAccessGuard } from "../guards/audit-log-access.guard"

describe("AuditLogController", () => {
  let controller: AuditLogController
  let auditLogService: AuditLogService
  let retentionService: AuditLogRetentionService

  const mockAuditLogService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    getStatistics: jest.fn(),
    verifyIntegrity: jest.fn(),
  }

  const mockRetentionService = {
    getRetentionPolicy: jest.fn(),
    getLogsNearExpiration: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: AuditLogRetentionService,
          useValue: mockRetentionService,
        },
      ],
    })
      .overrideGuard(AuditLogAccessGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile()

    controller = module.get<AuditLogController>(AuditLogController)
    auditLogService = module.get<AuditLogService>(AuditLogService)
    retentionService = module.get<AuditLogRetentionService>(AuditLogRetentionService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("findAll", () => {
    it("should return paginated audit logs", async () => {
      const filterDto = {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "DESC" as const,
      }

      const expectedResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      }

      mockAuditLogService.findAll.mockResolvedValue(expectedResult)

      const result = await controller.findAll(filterDto)

      expect(auditLogService.findAll).toHaveBeenCalledWith(filterDto)
      expect(result).toEqual(expectedResult)
    })
  })

  describe("getStatistics", () => {
    it("should return audit log statistics", async () => {
      const expectedStats = {
        totalLogs: 100,
        successfulLogs: 90,
        failedLogs: 10,
        actionTypeStats: [],
        severityStats: [],
      }

      mockAuditLogService.getStatistics.mockResolvedValue(expectedStats)

      const result = await controller.getStatistics()

      expect(auditLogService.getStatistics).toHaveBeenCalledWith(undefined, undefined)
      expect(result).toEqual(expectedStats)
    })

    it("should return statistics with date range", async () => {
      const startDate = "2024-01-01"
      const endDate = "2024-01-31"
      const expectedStats = {
        totalLogs: 50,
        successfulLogs: 45,
        failedLogs: 5,
        actionTypeStats: [],
        severityStats: [],
      }

      mockAuditLogService.getStatistics.mockResolvedValue(expectedStats)

      const result = await controller.getStatistics(startDate, endDate)

      expect(auditLogService.getStatistics).toHaveBeenCalledWith(new Date(startDate), new Date(endDate))
      expect(result).toEqual(expectedStats)
    })
  })

  describe("verifyIntegrity", () => {
    it("should verify log integrity", async () => {
      const logId = "log-123"
      mockAuditLogService.verifyIntegrity.mockResolvedValue(true)

      const result = await controller.verifyIntegrity(logId)

      expect(auditLogService.verifyIntegrity).toHaveBeenCalledWith(logId)
      expect(result).toEqual({
        id: logId,
        isValid: true,
        message: "Log integrity verified",
      })
    })

    it("should detect compromised log integrity", async () => {
      const logId = "log-123"
      mockAuditLogService.verifyIntegrity.mockResolvedValue(false)

      const result = await controller.verifyIntegrity(logId)

      expect(auditLogService.verifyIntegrity).toHaveBeenCalledWith(logId)
      expect(result).toEqual({
        id: logId,
        isValid: false,
        message: "Log integrity compromised",
      })
    })
  })
})
