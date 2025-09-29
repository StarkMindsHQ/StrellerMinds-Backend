import { Injectable, Logger } from "@nestjs/common"
import type { DataQualityRule } from "../entities/data-quality-rule.entity"

@Injectable()
export class DataValidationService {
  private readonly logger = new Logger(DataValidationService.name)

  async checkCompleteness(
    rule: DataQualityRule,
    data: any[],
  ): Promise<{
    passed: boolean
    score: number
    failedData?: any[]
  }> {
    const field = rule.conditions.field
    const requiredFields = rule.conditions.requiredFields || [field]

    let completeCount = 0
    const failedData: any[] = []

    for (const item of data) {
      const isComplete = requiredFields.every((f) => item[f] !== null && item[f] !== undefined && item[f] !== "")

      if (isComplete) {
        completeCount++
      } else {
        failedData.push(item)
      }
    }

    const completenessRate = data.length > 0 ? (completeCount / data.length) * 100 : 100
    const passed = completenessRate >= rule.threshold

    return {
      passed,
      score: completenessRate,
      failedData: passed ? undefined : failedData,
    }
  }

  async checkAccuracy(
    rule: DataQualityRule,
    data: any[],
  ): Promise<{
    passed: boolean
    score: number
    failedData?: any[]
  }> {
    const field = rule.conditions.field
    const expectedValues = rule.conditions.expectedValues
    const pattern = rule.conditions.pattern

    let accurateCount = 0
    const failedData: any[] = []

    for (const item of data) {
      let isAccurate = true

      if (expectedValues && !expectedValues.includes(item[field])) {
        isAccurate = false
      }

      if (pattern && !new RegExp(pattern).test(item[field])) {
        isAccurate = false
      }

      if (isAccurate) {
        accurateCount++
      } else {
        failedData.push(item)
      }
    }

    const accuracyRate = data.length > 0 ? (accurateCount / data.length) * 100 : 100
    const passed = accuracyRate >= rule.threshold

    return {
      passed,
      score: accuracyRate,
      failedData: passed ? undefined : failedData,
    }
  }

  async checkConsistency(
    rule: DataQualityRule,
    data: any[],
  ): Promise<{
    passed: boolean
    score: number
    failedData?: any[]
  }> {
    const fields = rule.conditions.fields
    const consistencyRules = rule.conditions.rules

    let consistentCount = 0
    const failedData: any[] = []

    for (const item of data) {
      let isConsistent = true

      for (const consistencyRule of consistencyRules) {
        const { field1, field2, operator } = consistencyRule

        switch (operator) {
          case "equals":
            if (item[field1] !== item[field2]) {
              isConsistent = false
            }
            break
          case "greater_than":
            if (item[field1] <= item[field2]) {
              isConsistent = false
            }
            break
          case "less_than":
            if (item[field1] >= item[field2]) {
              isConsistent = false
            }
            break
        }
      }

      if (isConsistent) {
        consistentCount++
      } else {
        failedData.push(item)
      }
    }

    const consistencyRate = data.length > 0 ? (consistentCount / data.length) * 100 : 100
    const passed = consistencyRate >= rule.threshold

    return {
      passed,
      score: consistencyRate,
      failedData: passed ? undefined : failedData,
    }
  }

  async checkValidity(
    rule: DataQualityRule,
    data: any[],
  ): Promise<{
    passed: boolean
    score: number
    failedData?: any[]
  }> {
    const field = rule.conditions.field
    const dataType = rule.conditions.dataType
    const format = rule.conditions.format
    const range = rule.conditions.range

    let validCount = 0
    const failedData: any[] = []

    for (const item of data) {
      let isValid = true
      const value = item[field]

      // Check data type
      if (dataType) {
        switch (dataType) {
          case "number":
            if (typeof value !== "number" || isNaN(value)) {
              isValid = false
            }
            break
          case "string":
            if (typeof value !== "string") {
              isValid = false
            }
            break
          case "date":
            if (!(value instanceof Date) && isNaN(Date.parse(value))) {
              isValid = false
            }
            break
          case "email":
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(value)) {
              isValid = false
            }
            break
        }
      }

      // Check format
      if (format && typeof value === "string") {
        if (!new RegExp(format).test(value)) {
          isValid = false
        }
      }

      // Check range
      if (range && typeof value === "number") {
        if (value < range.min || value > range.max) {
          isValid = false
        }
      }

      if (isValid) {
        validCount++
      } else {
        failedData.push(item)
      }
    }

    const validityRate = data.length > 0 ? (validCount / data.length) * 100 : 100
    const passed = validityRate >= rule.threshold

    return {
      passed,
      score: validityRate,
      failedData: passed ? undefined : failedData,
    }
  }

  async checkUniqueness(
    rule: DataQualityRule,
    data: any[],
  ): Promise<{
    passed: boolean
    score: number
    failedData?: any[]
  }> {
    const fields = rule.conditions.fields || [rule.conditions.field]
    const seen = new Set()
    const duplicates: any[] = []

    for (const item of data) {
      const key = fields.map((f) => item[f]).join("|")

      if (seen.has(key)) {
        duplicates.push(item)
      } else {
        seen.add(key)
      }
    }

    const uniquenessRate = data.length > 0 ? ((data.length - duplicates.length) / data.length) * 100 : 100
    const passed = uniquenessRate >= rule.threshold

    return {
      passed,
      score: uniquenessRate,
      failedData: passed ? undefined : duplicates,
    }
  }

  async checkTimeliness(
    rule: DataQualityRule,
    data: any[],
  ): Promise<{
    passed: boolean
    score: number
    failedData?: any[]
  }> {
    const field = rule.conditions.field
    const maxAge = rule.conditions.maxAge // in hours
    const now = new Date()

    let timelyCount = 0
    const failedData: any[] = []

    for (const item of data) {
      const timestamp = new Date(item[field])
      const ageInHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60)

      if (ageInHours <= maxAge) {
        timelyCount++
      } else {
        failedData.push(item)
      }
    }

    const timelinessRate = data.length > 0 ? (timelyCount / data.length) * 100 : 100
    const passed = timelinessRate >= rule.threshold

    return {
      passed,
      score: timelinessRate,
      failedData: passed ? undefined : failedData,
    }
  }

  async checkConformity(
    rule: DataQualityRule,
    data: any[],
  ): Promise<{
    passed: boolean
    score: number
    failedData?: any[]
  }> {
    const schema = rule.conditions.schema
    let conformCount = 0
    const failedData: any[] = []

    for (const item of data) {
      let isConform = true

      // Check required fields
      if (schema.required) {
        for (const requiredField of schema.required) {
          if (!item.hasOwnProperty(requiredField)) {
            isConform = false
            break
          }
        }
      }

      // Check field types
      if (schema.properties && isConform) {
        for (const [field, fieldSchema] of Object.entries(schema.properties)) {
          if (item.hasOwnProperty(field)) {
            const value = item[field]
            const expectedType = (fieldSchema as any).type

            if (expectedType === "string" && typeof value !== "string") {
              isConform = false
              break
            }
            if (expectedType === "number" && typeof value !== "number") {
              isConform = false
              break
            }
            if (expectedType === "boolean" && typeof value !== "boolean") {
              isConform = false
              break
            }
          }
        }
      }

      if (isConform) {
        conformCount++
      } else {
        failedData.push(item)
      }
    }

    const conformityRate = data.length > 0 ? (conformCount / data.length) * 100 : 100
    const passed = conformityRate >= rule.threshold

    return {
      passed,
      score: conformityRate,
      failedData: passed ? undefined : failedData,
    }
  }
}
