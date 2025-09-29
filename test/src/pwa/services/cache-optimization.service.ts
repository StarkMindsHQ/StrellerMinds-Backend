import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"

import type { CachePolicy, CacheStrategy } from "../entities/cache-policy.entity"

export interface CacheHeaders {
  "Cache-Control": string
  ETag?: string
  "Last-Modified"?: string
  Vary?: string
  Expires?: string
}

export interface CacheConfiguration {
  strategy: CacheStrategy
  maxAge: number
  staleWhileRevalidate?: number
  headers: CacheHeaders
  shouldCache: boolean
}

@Injectable()
export class CacheOptimizationService {
  private readonly logger = new Logger(CacheOptimizationService.name)
  private readonly defaultCacheConfig: CacheConfiguration = {
    strategy: "cache-first",
    maxAge: 3600,
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
    shouldCache: true,
  }

  private readonly cachePolicyRepository: Repository<CachePolicy>

  constructor(cachePolicyRepository: Repository<CachePolicy>) {
    this.cachePolicyRepository = cachePolicyRepository
  }

  async getCacheConfiguration(route: string, method = "GET"): Promise<CacheConfiguration> {
    try {
      // Find matching cache policy
      const policy = await this.cachePolicyRepository.findOne({
        where: {
          route,
          method: method.toUpperCase(),
          isActive: true,
        },
        order: { priority: "DESC" },
      })

      if (!policy) {
        // Try to find a wildcard policy
        const wildcardPolicy = await this.cachePolicyRepository.findOne({
          where: {
            route: { $like: route.split("/")[1] + "/*" } as any,
            method: method.toUpperCase(),
            isActive: true,
          },
          order: { priority: "DESC" },
        })

        if (wildcardPolicy) {
          return this.buildCacheConfiguration(wildcardPolicy)
        }

        return this.defaultCacheConfig
      }

      return this.buildCacheConfiguration(policy)
    } catch (error) {
      this.logger.error(`Failed to get cache configuration: ${error.message}`, error.stack)
      return this.defaultCacheConfig
    }
  }

  private buildCacheConfiguration(policy: CachePolicy): CacheConfiguration {
    const headers: CacheHeaders = {
      "Cache-Control": this.buildCacheControlHeader(policy),
      ...policy.headers,
    }

    // Add ETag support for better caching
    if (policy.strategy === "cache-first" || policy.strategy === "stale-while-revalidate") {
      headers.Vary = "Accept-Encoding, Accept-Language"
    }

    return {
      strategy: policy.strategy,
      maxAge: policy.maxAge,
      staleWhileRevalidate: policy.staleWhileRevalidate,
      headers,
      shouldCache: true,
    }
  }

  private buildCacheControlHeader(policy: CachePolicy): string {
    const directives: string[] = []

    switch (policy.strategy) {
      case "cache-first":
        directives.push("public")
        directives.push(`max-age=${policy.maxAge}`)
        break

      case "network-first":
        directives.push("public")
        directives.push(`max-age=${Math.min(policy.maxAge, 300)}`) // Shorter cache for network-first
        break

      case "stale-while-revalidate":
        directives.push("public")
        directives.push(`max-age=${policy.maxAge}`)
        if (policy.staleWhileRevalidate) {
          directives.push(`stale-while-revalidate=${policy.staleWhileRevalidate}`)
        }
        break

      case "cache-only":
        directives.push("public")
        directives.push(`max-age=${policy.maxAge}`)
        directives.push("immutable")
        break

      case "network-only":
        directives.push("no-cache")
        directives.push("no-store")
        directives.push("must-revalidate")
        break

      default:
        directives.push("public")
        directives.push(`max-age=${policy.maxAge}`)
    }

    return directives.join(", ")
  }

  async createCachePolicy(policyData: {
    route: string
    method?: string
    strategy: CacheStrategy
    maxAge?: number
    staleWhileRevalidate?: number
    headers?: Record<string, string>
    conditions?: any
    priority?: number
    description?: string
  }): Promise<CachePolicy> {
    const policy = this.cachePolicyRepository.create({
      route: policyData.route,
      method: policyData.method || "GET",
      strategy: policyData.strategy,
      maxAge: policyData.maxAge || 3600,
      staleWhileRevalidate: policyData.staleWhileRevalidate,
      headers: policyData.headers,
      conditions: policyData.conditions,
      priority: policyData.priority || 0,
      description: policyData.description,
      isActive: true,
    })

    return await this.cachePolicyRepository.save(policy)
  }

  async updateCachePolicy(id: string, updates: Partial<CachePolicy>): Promise<CachePolicy> {
    await this.cachePolicyRepository.update(id, updates)
    const updated = await this.cachePolicyRepository.findOne({ where: { id } })
    if (!updated) {
      throw new Error("Cache policy not found")
    }
    return updated
  }

  async deleteCachePolicy(id: string): Promise<void> {
    await this.cachePolicyRepository.update(id, { isActive: false })
  }

  async getCachePolicies(filters: {
    route?: string
    method?: string
    strategy?: CacheStrategy
    isActive?: boolean
    limit?: number
    offset?: number
  }): Promise<{ policies: CachePolicy[]; total: number }> {
    const query = this.cachePolicyRepository.createQueryBuilder("policy")

    if (filters.route) {
      query.andWhere("policy.route LIKE :route", { route: `%${filters.route}%` })
    }

    if (filters.method) {
      query.andWhere("policy.method = :method", { method: filters.method.toUpperCase() })
    }

    if (filters.strategy) {
      query.andWhere("policy.strategy = :strategy", { strategy: filters.strategy })
    }

    if (filters.isActive !== undefined) {
      query.andWhere("policy.isActive = :isActive", { isActive: filters.isActive })
    }

    query.orderBy("policy.priority", "DESC").addOrderBy("policy.createdAt", "DESC")

    if (filters.limit) {
      query.limit(filters.limit)
    }

    if (filters.offset) {
      query.offset(filters.offset)
    }

    const [policies, total] = await query.getManyAndCount()

    return { policies, total }
  }

  generateETag(data: any): string {
    const crypto = require("node:crypto")
    const hash = crypto.createHash("md5")
    hash.update(JSON.stringify(data))
    return `"${hash.digest("hex")}"`
  }

  isNotModified(ifNoneMatch?: string, etag?: string, ifModifiedSince?: string, lastModified?: Date): boolean {
    if (ifNoneMatch && etag) {
      return ifNoneMatch === etag
    }

    if (ifModifiedSince && lastModified) {
      const clientDate = new Date(ifModifiedSince)
      return clientDate >= lastModified
    }

    return false
  }

  async getCacheStats(): Promise<{
    totalPolicies: number
    activePolicies: number
    byStrategy: Record<CacheStrategy, number>
    byRoute: Record<string, number>
  }> {
    const [totalPolicies, activePolicies] = await Promise.all([
      this.cachePolicyRepository.count(),
      this.cachePolicyRepository.count({ where: { isActive: true } }),
    ])

    const strategyStats = await this.cachePolicyRepository
      .createQueryBuilder("policy")
      .select("policy.strategy", "strategy")
      .addSelect("COUNT(*)", "count")
      .where("policy.isActive = :isActive", { isActive: true })
      .groupBy("policy.strategy")
      .getRawMany()

    const routeStats = await this.cachePolicyRepository
      .createQueryBuilder("policy")
      .select("policy.route", "route")
      .addSelect("COUNT(*)", "count")
      .where("policy.isActive = :isActive", { isActive: true })
      .groupBy("policy.route")
      .getRawMany()

    const byStrategy = strategyStats.reduce(
      (acc, stat) => {
        acc[stat.strategy as CacheStrategy] = Number.parseInt(stat.count)
        return acc
      },
      {} as Record<CacheStrategy, number>,
    )

    const byRoute = routeStats.reduce((acc, stat) => {
      acc[stat.route] = Number.parseInt(stat.count)
      return acc
    }, {})

    return {
      totalPolicies,
      activePolicies,
      byStrategy,
      byRoute,
    }
  }
}
