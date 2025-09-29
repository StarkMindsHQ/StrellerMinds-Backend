import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { jest } from "@jest/globals"

import { DataGovernanceService } from "../services/data-governance.service"
import { DataGovernancePolicy } from "../entities/data-governance-policy.entity"
import { DataLineage } from "../entities/data-lineage.entity"

describe("DataGovernanceService", () => {
  let service: DataGovernanceService
  let policyRepository: Repository<DataGovernancePolicy>
  let lineageRepository: Repository<DataLineage>

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataGovernanceService,
        {
          provide: getRepositoryToken(DataGovernancePolicy),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(DataLineage),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
      ],
    }).compile()

    service = module.get<DataGovernanceService>(DataGovernanceService)
    policyRepository = module.get<Repository<DataGovernancePolicy>>(getRepositoryToken(DataGovernancePolicy))
    lineageRepository = module.get<Repository<DataLineage>>(getRepositoryToken(DataLineage))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("createPolicy", () => {
    it("should create a new governance policy", async () => {
      const policyData = {
        name: "Data Retention Policy",
        description: "Policy for data retention",
        category: "retention" as any,
        rules: { retentionPeriod: "7 years" },
        entityTypes: ["user", "transaction"],
        status: "active" as any,
      }

      const mockPolicy = { id: "policy1", ...policyData }

      jest.spyOn(policyRepository, "create").mockReturnValue(mockPolicy as any)
      jest.spyOn(policyRepository, "save").mockResolvedValue(mockPolicy as any)

      const result = await service.createPolicy(policyData)

      expect(result).toEqual(mockPolicy)
      expect(policyRepository.create).toHaveBeenCalledWith(policyData)
      expect(policyRepository.save).toHaveBeenCalledWith(mockPolicy)
    })
  })

  describe("getPolicies", () => {
    it("should return policies with filters", async () => {
      const mockPolicies = [
        {
          id: "policy1",
          name: "Policy 1",
          category: "retention",
          status: "active",
        },
        {
          id: "policy2",
          name: "Policy 2",
          category: "privacy",
          status: "active",
        },
      ]

      mockQueryBuilder.getMany.mockResolvedValue(mockPolicies)

      const result = await service.getPolicies({
        category: "retention",
        status: "active",
      })

      expect(result).toEqual(mockPolicies)
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("policy.category = :category", { category: "retention" })
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("policy.status = :status", { status: "active" })
    })

    it("should return all policies when no filters provided", async () => {
      const mockPolicies = [
        { id: "policy1", name: "Policy 1" },
        { id: "policy2", name: "Policy 2" },
      ]

      mockQueryBuilder.getMany.mockResolvedValue(mockPolicies)

      const result = await service.getPolicies({})

      expect(result).toEqual(mockPolicies)
      expect(mockQueryBuilder.where).not.toHaveBeenCalled()
    })
  })

  describe("updatePolicy", () => {
    it("should update a policy", async () => {
      const policyId = "policy1"
      const updates = { name: "Updated Policy Name" }
      const updatedPolicy = { id: policyId, name: "Updated Policy Name" }

      jest.spyOn(policyRepository, "update").mockResolvedValue({ affected: 1 } as any)
      jest.spyOn(policyRepository, "findOne").mockResolvedValue(updatedPolicy as any)

      const result = await service.updatePolicy(policyId, updates)

      expect(result).toEqual(updatedPolicy)
      expect(policyRepository.update).toHaveBeenCalledWith(policyId, updates)
      expect(policyRepository.findOne).toHaveBeenCalledWith({ where: { id: policyId } })
    })

    it("should throw error if policy not found", async () => {
      const policyId = "nonexistent"
      const updates = { name: "Updated Name" }

      jest.spyOn(policyRepository, "update").mockResolvedValue({ affected: 1 } as any)
      jest.spyOn(policyRepository, "findOne").mockResolvedValue(null)

      await expect(service.updatePolicy(policyId, updates)).rejects.toThrow("Policy with id nonexistent not found")
    })
  })

  describe("deletePolicy", () => {
    it("should delete a policy", async () => {
      const policyId = "policy1"

      jest.spyOn(policyRepository, "delete").mockResolvedValue({ affected: 1 } as any)

      await service.deletePolicy(policyId)

      expect(policyRepository.delete).toHaveBeenCalledWith(policyId)
    })
  })

  describe("createLineage", () => {
    it("should create data lineage record", async () => {
      const lineageData = {
        sourceEntity: "users",
        targetEntity: "user_profiles",
        transformationType: "join" as any,
        transformationRules: { joinKey: "user_id" },
        dataFlow: "ETL Pipeline",
      }

      const mockLineage = { id: "lineage1", ...lineageData }

      jest.spyOn(lineageRepository, "create").mockReturnValue(mockLineage as any)
      jest.spyOn(lineageRepository, "save").mockResolvedValue(mockLineage as any)

      const result = await service.createLineage(lineageData)

      expect(result).toEqual(mockLineage)
      expect(lineageRepository.create).toHaveBeenCalledWith(lineageData)
      expect(lineageRepository.save).toHaveBeenCalledWith(mockLineage)
    })
  })

  describe("getLineage", () => {
    it("should return lineage for entity", async () => {
      const entityName = "users"
      const mockLineage = [
        {
          id: "lineage1",
          sourceEntity: "users",
          targetEntity: "user_profiles",
          transformationType: "join",
        },
      ]

      mockQueryBuilder.getMany.mockResolvedValue(mockLineage)

      const result = await service.getLineage(entityName)

      expect(result).toEqual(mockLineage)
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "lineage.sourceEntity = :entity OR lineage.targetEntity = :entity",
        { entity: entityName }
      )
    })
  })

  describe("validateCompliance", () => {
    it("should validate compliance for entity", async () => {
      const entityType = "user"
      const data = [
        { id: 1, email: "user1@example.com", createdAt: new Date() },
        { id: 2, email: "user2@example.com", createdAt: new Date() },
      ]

      const mockPolicies = [
        {
          id: "policy1",
          name: "Email Validation Policy",
          category: "privacy",
          rules: { requireEmailValidation: true },
          entityTypes: ["user"],
          status: "active",
        },
      ]

      jest.spyOn(policyRepository, "find").mockResolvedValue(mockPolicies as any)

      const result = await service.validateCompliance(entityType, data)

      expect(result).toHaveProperty("compliant")
      expect(result).toHaveProperty("violations")
      expect(result).toHaveProperty("score")
      expect(policyRepository.find).toHaveBeenCalledWith({
        where: {
          status: "active",
        },
      })
    })

    it("should return compliant result when no policies apply", async () => {
      const entityType = "course"
      const data = [{ id: 1, name: "Course 1" }]

      jest.spyOn(policyRepository, "find").mockResolvedValue([])

      const result = await service.validateCompliance(entityType, data)

      expect(result.compliant).toBe(true)
      expect(result.violations).toHaveLength(0)
      expect(result.score).toBe(100)
    })
  })

  describe("getComplianceReport", () => {
    it("should generate compliance report", async () => {
      const entityType = "user"
      const mockPolicies = [
        {
          id: "policy1",
          name: "Privacy Policy",
          category: "privacy",
          entityTypes: ["user"],
          status: "active",
        },
      ]

      jest.spyOn(policyRepository, "find").mockResolvedValue(mockPolicies as any)

      const result = await service.getComplianceReport(entityType)

      expect(result).toHaveProperty("entityType", entityType)
      expect(result).toHaveProperty("applicablePolicies")
      expect(result).toHaveProperty("complianceStatus")
      expect(result).toHaveProperty("recommendations")
      expect(result).toHaveProperty("generatedAt")
      expect(result.applicablePolicies).toHaveLength(1)
    })
  })

  describe("archiveOldPolicies", () => {
    it("should archive old policies", async () => {
      const cutoffDate = new Date()
      cutoffDate.setMonths(cutoffDate.getMonths() - 12)

      const mockOldPolicies = [
        {
          id: "policy1",
          name: "Old Policy",
          status: "active",
          updatedAt: new Date("2022-01-01"),
        },
      ]

      mockQueryBuilder.getMany.mockResolvedValue(mockOldPolicies)
      jest.spyOn(policyRepository, "update").mockResolvedValue({ affected: 1 } as any)

      const result = await service.archiveOldPolicies(12)

      expect(result).toBe(1)
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("policy.updatedAt < :cutoffDate", { cutoffDate })
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("policy.status != :status", { status: "archived" })
      expect(policyRepository.update).toHaveBeenCalledWith("policy1", { status: "archived" })
    })
  })

  describe("getDataClassification", () => {
    it("should return data classification for entity", async () => {
      const entityType = "user"

      const result = await service.getDataClassification(entityType)

      expect(result).toHaveProperty("entityType", entityType)
      expect(result).toHaveProperty("classification")
      expect(result).toHaveProperty("sensitiveFields")
      expect(result).toHaveProperty("retentionPeriod")
      expect(result).toHaveProperty("accessLevel")
    })

    it("should handle unknown entity types", async () => {
      const entityType = "unknown_entity"

      const result = await service.getDataClassification(entityType)

      expect(result.classification).toBe("unclassified")
      expect(result.sensitiveFields).toHaveLength(0)
    })
  })
})
