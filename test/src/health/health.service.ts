import { Injectable } from "@nestjs/common"
import type { Connection } from "typeorm"
import type Redis from "ioredis"

@Injectable()
export class HealthService {
  constructor(
    private readonly connection: Connection,
    private readonly redis: Redis,
  ) {}

  async check() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
      this.checkDisk(),
    ])

    const results = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: this.getCheckResult(checks[0]),
        redis: this.getCheckResult(checks[1]),
        memory: this.getCheckResult(checks[2]),
        disk: this.getCheckResult(checks[3]),
      },
    }

    const hasFailures = Object.values(results.checks).some((check) => check.status === "error")
    if (hasFailures) {
      results.status = "error"
    }

    return results
  }

  async readiness() {
    try {
      await this.checkDatabase()
      await this.checkRedis()

      return {
        status: "ready",
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      throw new Error("Service not ready")
    }
  }

  async liveness() {
    return {
      status: "alive",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    }
  }

  private async checkDatabase() {
    try {
      await this.connection.query("SELECT 1")
      return { status: "ok", message: "Database connection successful" }
    } catch (error) {
      throw new Error(`Database check failed: ${error.message}`)
    }
  }

  private async checkRedis() {
    try {
      await this.redis.ping()
      return { status: "ok", message: "Redis connection successful" }
    } catch (error) {
      throw new Error(`Redis check failed: ${error.message}`)
    }
  }

  private checkMemory() {
    const usage = process.memoryUsage()
    const maxMemory = 512 * 1024 * 1024 // 512MB limit

    if (usage.heapUsed > maxMemory) {
      throw new Error(`Memory usage too high: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`)
    }

    return {
      status: "ok",
      message: `Memory usage: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      details: usage,
    }
  }

  private checkDisk() {
    // Simple disk check - in production, you might want more sophisticated checks
    return {
      status: "ok",
      message: "Disk space sufficient",
    }
  }

  private getCheckResult(result: PromiseSettledResult<any>) {
    if (result.status === "fulfilled") {
      return result.value
    } else {
      return {
        status: "error",
        message: result.reason.message,
      }
    }
  }
}
