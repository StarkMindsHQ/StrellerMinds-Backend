import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { AuditLogService } from "../services/audit-log.service"
import { AuditLog, AuditActionType } from "../entities/audit-log.entity"
import type { CreateAuditLogDto } from "../dto/create-audit-log.dto"

describe("AuditLogService", () => {
  let service: AuditLogService
  let repository: Repository<AuditLog>

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  }

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getMany: jest.fn(),
    clone: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<AuditLogService>(AuditLogService)
    repository = module.get<Repository<AuditLog>>(getRepositoryToken(AuditLog))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("createLog", () => {
    it("should create and save an audit log", async () => {
      const createDto: CreateAuditLogDto = {
        adminId: "admin-123",
        adminEmail: "admin@example.com",
        adminRole: "super_admin",
        actionType: AuditActionType.CREATE,
        resourceType: "User",
        description: "Created new user",
        ipAddress: "192.168.1.1",
        isSuccessful: true,
      }

      const mockAuditLog = {
        id: "log-123",
        ...createDto,
        createdAt: new Date(),
        checksum: "mock-checksum",
      }

      mockRepository.create.mockReturnValue(mockAuditLog)
      mockRepository.save.mockResolvedValue(mockAuditLog)

      const result = await service.createLog(createDto)

      expect(mockRepository.create).toHaveBeenCalledWith(createDto)
      expect(mockRepository.save).toHaveBeenCalled()
      expect(result).toEqual(mockAuditLog)
    })

    it("should handle errors when creating audit log", async () => {
      const createDto: CreateAuditLogDto = {
        adminId: "admin-123",
        adminEmail: "admin@example.com",
        adminRole: "super_admin",
        actionType: AuditActionType.CREATE,
        resourceType: "User",
        description: "Created new user",
        ipAddress: "192.168.1.1",
      }

      mockRepository.create.mockReturnValue(createDto)
      mockRepository.save.mockRejectedValue(new Error("Database error"))

      await expect(service.createLog(createDto)).rejects.toThrow("Database error")
    })
  })

  describe("findAll", () => {
    it("should return paginated audit logs", async () => {
      const filterDto = {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "DESC" as const,
      }

      const mockLogs = [
        {
          id: "log-1",
          adminId: "admin-123",
          actionType: AuditActionType.CREATE,
          createdAt: new Date(),
        },
      ]

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockQueryBuilder.getCount.mockResolvedValue(1)
      mockQueryBuilder.getMany.mockResolvedValue(mockLogs)

      const result = await service.findAll(filterDto)

      expect(result).toEqual({
        data: mockLogs,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      })
    })
  })

  describe("verifyIntegrity", () => {
    it("should verify log integrity successfully", async () => {
      const mockLog = {
        id: "log-123",
        adminId: "admin-123",
        actionType: AuditActionType.CREATE,
        resourceType: "User",
        description: "Test log",
        createdAt: new Date(),
        checksum: "valid-checksum",
      }

      mockRepository.findOne.mockResolvedValue(mockLog)

      // Mock the checksum generation to return the same value
      jest.spyOn(service as any, "generateChecksum").mockReturnValue("valid-checksum")

      const result = await service.verifyIntegrity("log-123")

      expect(result).toBe(true)
    })

    it("should detect compromised log integrity", async () => {
      const mockLog = {
        id: "log-123",
        adminId: "admin-123",
        actionType: AuditActionType.CREATE,
        resourceType: "User",
        description: "Test log",
        createdAt: new Date(),
        checksum: "invalid-checksum",
      }

      mockRepository.findOne.mockResolvedValue(mockLog)

      // Mock the checksum generation to return a different value
      jest.spyOn(service as any, "generateChecksum").mockReturnValue("valid-checksum")

      const result = await service.verifyIntegrity("log-123")

      expect(result).toBe(false)
    })
  })
})
