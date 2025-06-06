import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { AuditLogRetentionService } from "../services/audit-log-retention.service"
import { AuditLog, AuditSeverity } from "../entities/audit-log.entity"

describe("AuditLogRetentionService", () => {
  let service: AuditLogRetentionService
  let repository: Repository<AuditLog>

  const mockRepository = {
    delete: jest.fn(),
    count: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogRetentionService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<AuditLogRetentionService>(AuditLogRetentionService)
    repository = module.get<Repository<AuditLog>>(getRepositoryToken(AuditLog))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("cleanupExpiredLogs", () => {
    it("should delete expired logs based on retention policy", async () => {
      mockRepository.delete.mockResolvedValue({ affected: 5 })

      await service.cleanupExpiredLogs()

      expect(mockRepository.delete).toHaveBeenCalledTimes(4) // One for each severity level

      // Verify that delete was called with correct parameters for each severity
      expect(mockRepository.delete).toHaveBeenCalledWith({
        severity: AuditSeverity.CRITICAL,
        createdAt: expect.any(Object),
      })
    })
  })

  describe("getRetentionPolicy", () => {
    it("should return current retention policy", async () => {
      const policy = await service.getRetentionPolicy()

      expect(policy).toEqual({
        [AuditSeverity.CRITICAL]: 2555,
        [AuditSeverity.HIGH]: 1095,
        [AuditSeverity.MEDIUM]: 365,
        [AuditSeverity.LOW]: 90,
      })
    })
  })

  describe("getLogsNearExpiration", () => {
    it("should return logs near expiration", async () => {
      mockRepository.count.mockResolvedValue(10)

      const result = await service.getLogsNearExpiration(7)

      expect(mockRepository.count).toHaveBeenCalledTimes(4)
      expect(result).toHaveLength(4)
      expect(result[0]).toEqual({
        severity: AuditSeverity.CRITICAL,
        count: 10,
        daysUntilExpiration: 7,
      })
    })

    it("should return empty array when no logs are near expiration", async () => {
      mockRepository.count.mockResolvedValue(0)

      const result = await service.getLogsNearExpiration(7)

      expect(result).toHaveLength(0)
    })
  })
})
