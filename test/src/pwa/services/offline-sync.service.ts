import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { Queue } from "bull"

import type { OfflineSync, SyncStatus, SyncOperation } from "../entities/offline-sync.entity"

export interface CreateSyncJobDto {
  userId?: string
  operation: SyncOperation
  entityType: string
  entityId?: string
  data: any
  metadata?: any
  priority?: number
}

export interface SyncResult {
  success: boolean
  data?: any
  error?: string
}

@Injectable()
export class OfflineSyncService {
  private readonly logger = new Logger("OfflineSyncService")

  constructor(
    private readonly syncRepository: Repository<OfflineSync>,
    private readonly syncQueue: Queue,
  ) {}

  async createSyncJob(dto: CreateSyncJobDto): Promise<OfflineSync> {
    try {
      const syncJob = this.syncRepository.create({
        userId: dto.userId,
        operation: dto.operation,
        entityType: dto.entityType,
        entityId: dto.entityId,
        data: dto.data,
        metadata: {
          clientTimestamp: new Date(),
          ...dto.metadata,
        },
        priority: dto.priority || 5,
        status: "pending",
      })

      const saved = await this.syncRepository.save(syncJob)

      // Queue for processing
      await this.syncQueue.add(
        "process-sync",
        { syncJobId: saved.id },
        {
          priority: saved.priority,
          attempts: saved.maxRetries,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      )

      this.logger.log(`Created sync job: ${saved.id} for ${dto.entityType}`)

      return saved
    } catch (error) {
      this.logger.error(`Failed to create sync job: ${error.message}`, error.stack)
      throw error
    }
  }

  async batchCreateSyncJobs(jobs: CreateSyncJobDto[]): Promise<OfflineSync[]> {
    try {
      const syncJobs = jobs.map((dto) =>
        this.syncRepository.create({
          userId: dto.userId,
          operation: dto.operation,
          entityType: dto.entityType,
          entityId: dto.entityId,
          data: dto.data,
          metadata: {
            clientTimestamp: new Date(),
            ...dto.metadata,
          },
          priority: dto.priority || 5,
          status: "pending",
        }),
      )

      const saved = await this.syncRepository.save(syncJobs)

      // Queue all jobs for processing
      const queueJobs = saved.map((job) => ({
        name: "process-sync",
        data: { syncJobId: job.id },
        opts: {
          priority: job.priority,
          attempts: job.maxRetries,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      }))

      await this.syncQueue.addBulk(queueJobs)

      this.logger.log(`Created ${saved.length} sync jobs`)

      return saved
    } catch (error) {
      this.logger.error(`Failed to create batch sync jobs: ${error.message}`, error.stack)
      throw error
    }
  }

  async updateSyncJobStatus(id: string, status: SyncStatus, result?: SyncResult, errorMessage?: string): Promise<void> {
    try {
      const updates: Partial<OfflineSync> = {
        status,
        processedAt: status === "completed" || status === "failed" ? new Date() : undefined,
        result: result?.data,
        errorMessage: errorMessage || result?.error,
      }

      if (status === "failed") {
        const syncJob = await this.syncRepository.findOne({ where: { id } })
        if (syncJob) {
          updates.retryCount = syncJob.retryCount + 1
          if (syncJob.retryCount < syncJob.maxRetries) {
            updates.status = "pending"
            updates.nextRetryAt = new Date(Date.now() + Math.pow(2, syncJob.retryCount) * 1000)
          }
        }
      }

      await this.syncRepository.update(id, updates)
    } catch (error) {
      this.logger.error(`Failed to update sync job status: ${error.message}`, error.stack)
      throw error
    }
  }

  async getSyncJobs(filters: {
    userId?: string
    status?: SyncStatus
    entityType?: string
    limit?: number
    offset?: number
  }): Promise<{ jobs: OfflineSync[]; total: number }> {
    const query = this.syncRepository.createQueryBuilder("sync")

    if (filters.userId) {
      query.andWhere("sync.userId = :userId", { userId: filters.userId })
    }

    if (filters.status) {
      query.andWhere("sync.status = :status", { status: filters.status })
    }

    if (filters.entityType) {
      query.andWhere("sync.entityType = :entityType", { entityType: filters.entityType })
    }

    query.orderBy("sync.priority", "DESC").addOrderBy("sync.createdAt", "ASC")

    if (filters.limit) {
      query.limit(filters.limit)
    }

    if (filters.offset) {
      query.offset(filters.offset)
    }

    const [jobs, total] = await query.getManyAndCount()

    return { jobs, total }
  }

  async getPendingSyncJobs(limit = 100): Promise<OfflineSync[]> {
    return await this.syncRepository.find({
      where: [
        { status: "pending" },
        {
          status: "failed",
          nextRetryAt: { $lte: new Date() } as any,
        },
      ],
      order: {
        priority: "DESC",
        createdAt: "ASC",
      },
      take: limit,
    })
  }

  async getSyncStats(): Promise<{
    total: number
    byStatus: Record<SyncStatus, number>
    byEntityType: Record<string, number>
    avgProcessingTime: number
  }> {
    const total = await this.syncRepository.count()

    const statusStats = await this.syncRepository
      .createQueryBuilder("sync")
      .select("sync.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("sync.status")
      .getRawMany()

    const entityTypeStats = await this.syncRepository
      .createQueryBuilder("sync")
      .select("sync.entityType", "entityType")
      .addSelect("COUNT(*)", "count")
      .groupBy("sync.entityType")
      .getRawMany()

    const avgProcessingTimeResult = await this.syncRepository
      .createQueryBuilder("sync")
      .select("AVG(EXTRACT(EPOCH FROM (sync.processedAt - sync.createdAt)))", "avgTime")
      .where("sync.processedAt IS NOT NULL")
      .getRawOne()

    const byStatus = statusStats.reduce(
      (acc, stat) => {
        acc[stat.status as SyncStatus] = Number.parseInt(stat.count)
        return acc
      },
      {} as Record<SyncStatus, number>,
    )

    const byEntityType = entityTypeStats.reduce((acc, stat) => {
      acc[stat.entityType] = Number.parseInt(stat.count)
      return acc
    }, {})

    return {
      total,
      byStatus,
      byEntityType,
      avgProcessingTime: Number.parseFloat(avgProcessingTimeResult?.avgTime || "0"),
    }
  }

  async cleanupOldJobs(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const result = await this.syncRepository.delete({
      status: { $in: ["completed", "cancelled"] } as any,
      processedAt: { $lt: cutoffDate } as any,
    })

    this.logger.log(`Cleaned up ${result.affected} old sync jobs`)

    return result.affected || 0
  }
}
