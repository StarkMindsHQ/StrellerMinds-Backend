import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"

import { type DataWarehouseMetric, MetricType, AggregationType } from "../entities/data-warehouse-metric.entity"

export interface MetricData {
  metricName: string
  metricType: MetricType
  value: number
  dimensions: Record<string, string>
  tags?: Record<string, string>
  timestamp: Date
  aggregationType?: AggregationType
  granularity?: string
}

@Injectable()
export class DataWarehouseService {
  private readonly logger = new Logger(DataWarehouseService.name)

  constructor(private readonly metricRepository: Repository<DataWarehouseMetric>) {}

  async recordMetric(metricData: MetricData): Promise<void> {
    try {
      const metric = this.metricRepository.create({
        ...metricData,
        aggregationType: metricData.aggregationType || AggregationType.SUM,
        granularity: metricData.granularity || "1h",
      })

      await this.metricRepository.save(metric)
    } catch (error) {
      this.logger.error(`Failed to record metric: ${error.message}`, error.stack)
      throw error
    }
  }

  async getMetrics(filters: {
    metricName?: string
    metricType?: MetricType
    dimensions?: Record<string, string>
    startDate?: Date
    endDate?: Date
    granularity?: string
    limit?: number
  }): Promise<DataWarehouseMetric[]> {
    const query = this.metricRepository.createQueryBuilder("metric")

    if (filters.metricName) {
      query.andWhere("metric.metricName = :metricName", {
        metricName: filters.metricName,
      })
    }

    if (filters.metricType) {
      query.andWhere("metric.metricType = :metricType", {
        metricType: filters.metricType,
      })
    }

    if (filters.dimensions) {
      for (const [key, value] of Object.entries(filters.dimensions)) {
        query.andWhere(`metric.dimensions ->> :key = :value`, {
          key,
          value,
        })
      }
    }

    if (filters.startDate) {
      query.andWhere("metric.timestamp >= :startDate", {
        startDate: filters.startDate,
      })
    }

    if (filters.endDate) {
      query.andWhere("metric.timestamp <= :endDate", {
        endDate: filters.endDate,
      })
    }

    if (filters.granularity) {
      query.andWhere("metric.granularity = :granularity", {
        granularity: filters.granularity,
      })
    }

    query.orderBy("metric.timestamp", "DESC")

    if (filters.limit) {
      query.limit(filters.limit)
    }

    return query.getMany()
  }

  async aggregateMetrics(startTime: Date, endTime: Date, granularity: string): Promise<void> {
    this.logger.log(
      `Aggregating metrics from ${startTime.toISOString()} to ${endTime.toISOString()} with granularity ${granularity}`,
    )

    // Get unique metric names and dimensions combinations
    const uniqueMetrics = await this.metricRepository
      .createQueryBuilder("metric")
      .select(["metric.metricName", "metric.dimensions", "metric.aggregationType"])
      .where("metric.timestamp >= :startTime", { startTime })
      .andWhere("metric.timestamp < :endTime", { endTime })
      .andWhere("metric.granularity != :granularity", { granularity })
      .groupBy("metric.metricName, metric.dimensions, metric.aggregationType")
      .getRawMany()

    for (const uniqueMetric of uniqueMetrics) {
      await this.aggregateMetricGroup(
        uniqueMetric.metric_metricName,
        JSON.parse(uniqueMetric.metric_dimensions),
        uniqueMetric.metric_aggregationType,
        startTime,
        endTime,
        granularity,
      )
    }
  }

  private async aggregateMetricGroup(
    metricName: string,
    dimensions: Record<string, string>,
    aggregationType: AggregationType,
    startTime: Date,
    endTime: Date,
    granularity: string,
  ): Promise<void> {
    const query = this.metricRepository
      .createQueryBuilder("metric")
      .where("metric.metricName = :metricName", { metricName })
      .andWhere("metric.timestamp >= :startTime", { startTime })
      .andWhere("metric.timestamp < :endTime", { endTime })
      .andWhere("metric.granularity != :granularity", { granularity })

    // Add dimensions filter
    for (const [key, value] of Object.entries(dimensions)) {
      query.andWhere(`metric.dimensions ->> :key = :value`, {
        key: `dim_${key}`,
        value,
      })
    }

    let aggregatedValue: number

    switch (aggregationType) {
      case AggregationType.SUM:
        const sumResult = await query.select("SUM(metric.value)", "sum").getRawOne()
        aggregatedValue = Number.parseFloat(sumResult.sum) || 0
        break
      case AggregationType.AVG:
        const avgResult = await query.select("AVG(metric.value)", "avg").getRawOne()
        aggregatedValue = Number.parseFloat(avgResult.avg) || 0
        break
      case AggregationType.COUNT:
        aggregatedValue = await query.getCount()
        break
      case AggregationType.MIN:
        const minResult = await query.select("MIN(metric.value)", "min").getRawOne()
        aggregatedValue = Number.parseFloat(minResult.min) || 0
        break
      case AggregationType.MAX:
        const maxResult = await query.select("MAX(metric.value)", "max").getRawOne()
        aggregatedValue = Number.parseFloat(maxResult.max) || 0
        break
      default:
        aggregatedValue = 0
    }

    // Save aggregated metric
    const aggregatedMetric = this.metricRepository.create({
      metricName,
      metricType: MetricType.GAUGE,
      value: aggregatedValue,
      dimensions,
      timestamp: startTime,
      aggregationType,
      granularity,
    })

    await this.metricRepository.save(aggregatedMetric)
  }
}
