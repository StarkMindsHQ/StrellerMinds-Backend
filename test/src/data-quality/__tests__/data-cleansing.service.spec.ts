import { Test, type TestingModule } from "@nestjs/testing"
import { getQueueToken } from "@nestjs/bull"
import type { Queue } from "bull"

import { DataCleansingService } from "../services/data-cleansing.service"

describe("DataCleansingService", () => {
  let service: DataCleansingService
  let cleansingQueue: Queue

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataCleansingService,
        {
          provide: getQueueToken("data-cleansing"),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<DataCleansingService>(DataCleansingService)
    cleansingQueue = module.get<Queue>(getQueueToken("data-cleansing"))
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("cleanseData", () => {
    it("should remove nulls", async () => {
      const data = [
        { id: 1, name: "John", email: "john@example.com" },
        { id: 2, name: "Jane", email: null },
        { id: 3, name: "Bob", email: "bob@example.com" },
      ]

      const rules = [
        {
          id: "rule1",
          name: "Remove Nulls",
          field: "email",
          operation: "remove_nulls",
        },
      ]

      const result = await service.cleanseData(data, rules)

      expect(result.originalCount).toBe(3)
      expect(result.cleanedCount).toBe(2)
      expect(result.removedCount).toBe(1)
      expect(result.cleanedData).toHaveLength(2)
      expect(result.cleanedData.every((item) => item.email !== null)).toBe(true)
    })

    it("should trim whitespace", async () => {
      const data = [
        { id: 1, name: "  John  " },
        { id: 2, name: "Jane" },
        { id: 3, name: "  Bob  " },
      ]

      const rules = [
        {
          id: "rule1",
          name: "Trim Whitespace",
          field: "name",
          operation: "trim_whitespace",
        },
      ]

      const result = await service.cleanseData(data, rules)

      expect(result.modifiedCount).toBe(2)
      expect(result.cleanedData[0].name).toBe("John")
      expect(result.cleanedData[1].name).toBe("Jane")
      expect(result.cleanedData[2].name).toBe("Bob")
    })

    it("should remove duplicates", async () => {
      const data = [
        { id: 1, email: "john@example.com" },
        { id: 2, email: "jane@example.com" },
        { id: 3, email: "john@example.com" },
      ]

      const rules = [
        {
          id: "rule1",
          name: "Remove Duplicates",
          field: "email",
          operation: "remove_duplicates",
        },
      ]

      const result = await service.cleanseData(data, rules)

      expect(result.originalCount).toBe(3)
      expect(result.cleanedCount).toBe(2)
      expect(result.removedCount).toBe(1)
      expect(result.cleanedData).toHaveLength(2)
    })

    it("should standardize email format", async () => {
      const data = [
        { id: 1, email: "JOHN@EXAMPLE.COM  " },
        { id: 2, email: "  jane@example.com" },
      ]

      const rules = [
        {
          id: "rule1",
          name: "Standardize Email",
          field: "email",
          operation: "standardize_format",
          parameters: { format: "email" },
        },
      ]

      const result = await service.cleanseData(data, rules)

      expect(result.modifiedCount).toBe(2)
      expect(result.cleanedData[0].email).toBe("john@example.com")
      expect(result.cleanedData[1].email).toBe("jane@example.com")
    })
  })
})
