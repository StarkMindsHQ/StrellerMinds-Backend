import { validate } from "class-validator"
import { plainToClass } from "class-transformer"
import { SearchDto } from "./search.dto"
import { AdvancedFilterDto } from "./advanced-filter.dto"
import { SearchSuggestionDto } from "./search-suggestion.dto"

describe("Search DTOs", () => {
  describe("SearchDto", () => {
    it("should validate a valid search DTO", async () => {
      const dto = plainToClass(SearchDto, {
        query: "stellar blockchain",
        page: 1,
        limit: 10,
      })

      const errors = await validate(dto)
      expect(errors).toHaveLength(0)
    })

    it("should fail validation for empty query", async () => {
      const dto = plainToClass(SearchDto, {
        query: "",
        page: 1,
        limit: 10,
      })

      const errors = await validate(dto)
      expect(errors).toHaveLength(1)
      expect(errors[0].property).toBe("query")
    })

    it("should fail validation for invalid page number", async () => {
      const dto = plainToClass(SearchDto, {
        query: "stellar",
        page: 0,
        limit: 10,
      })

      const errors = await validate(dto)
      expect(errors).toHaveLength(1)
      expect(errors[0].property).toBe("page")
    })

    it("should fail validation for invalid limit", async () => {
      const dto = plainToClass(SearchDto, {
        query: "stellar",
        page: 1,
        limit: 101,
      })

      const errors = await validate(dto)
      expect(errors).toHaveLength(1)
      expect(errors[0].property).toBe("limit")
    })

    it("should use default values when not provided", () => {
      const dto = plainToClass(SearchDto, {
        query: "stellar",
      })

      expect(dto.page).toBe(1)
      expect(dto.limit).toBe(10)
    })
  })

  describe("AdvancedFilterDto", () => {
    it("should validate a valid advanced filter DTO", async () => {
      const dto = plainToClass(AdvancedFilterDto, {
        query: "stellar",
        categories: ["blockchain", "development"],
        levels: ["beginner", "intermediate"],
        priceRange: { min: 0, max: 200 },
        durationRange: { min: 60, max: 300 },
        instructors: ["John Doe"],
        tags: ["stellar", "blockchain"],
        sortBy: "relevance",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      })

      const errors = await validate(dto)
      expect(errors).toHaveLength(0)
    })

    it("should validate price range", async () => {
      const dto = plainToClass(AdvancedFilterDto, {
        query: "stellar",
        priceRange: { min: 100, max: 50 }, // Invalid: min > max
      })

      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
    })

    it("should validate duration range", async () => {
      const dto = plainToClass(AdvancedFilterDto, {
        query: "stellar",
        durationRange: { min: 300, max: 100 }, // Invalid: min > max
      })

      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
    })

    it("should validate sort options", async () => {
      const dto = plainToClass(AdvancedFilterDto, {
        query: "stellar",
        sortBy: "invalid_sort",
        sortOrder: "invalid_order",
      })

      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
    })
  })

  describe("SearchSuggestionDto", () => {
    it("should validate a valid suggestion DTO", async () => {
      const dto = plainToClass(SearchSuggestionDto, {
        query: "stel",
        limit: 5,
      })

      const errors = await validate(dto)
      expect(errors).toHaveLength(0)
    })

    it("should fail validation for short query", async () => {
      const dto = plainToClass(SearchSuggestionDto, {
        query: "a",
        limit: 5,
      })

      const errors = await validate(dto)
      expect(errors).toHaveLength(1)
      expect(errors[0].property).toBe("query")
    })

    it("should fail validation for excessive limit", async () => {
      const dto = plainToClass(SearchSuggestionDto, {
        query: "stellar",
        limit: 21,
      })

      const errors = await validate(dto)
      expect(errors).toHaveLength(1)
      expect(errors[0].property).toBe("limit")
    })

    it("should use default limit when not provided", () => {
      const dto = plainToClass(SearchSuggestionDto, {
        query: "stellar",
      })

      expect(dto.limit).toBe(10)
    })
  })
})
