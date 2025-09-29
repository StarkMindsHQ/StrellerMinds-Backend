import { Processor, Process } from "@nestjs/bull"
import type { Job } from "bull"
import { Logger } from "@nestjs/common"

@Processor("data-cleansing")
export class DataCleansingProcessor {
  private readonly logger = new Logger(DataCleansingProcessor.name)

  @Process("process-cleansing-result")
  async processCleansingResult(
    job: Job<{
      result: any
      timestamp: Date
    }>,
  ) {
    this.logger.log("Processing cleansing result")

    try {
      const { result } = job.data

      // Log cleansing statistics
      this.logger.log(`Cleansing completed: ${result.originalCount} -> ${result.cleanedCount} records`)
      this.logger.log(`Modified: ${result.modifiedCount}, Removed: ${result.removedCount}`)

      if (result.issues.length > 0) {
        this.logger.warn(`Cleansing issues: ${result.issues.join(", ")}`)
      }

      // Could store results, send notifications, etc.
    } catch (error) {
      this.logger.error(`Failed to process cleansing result: ${error.message}`, error.stack)
      throw error
    }
  }
}
