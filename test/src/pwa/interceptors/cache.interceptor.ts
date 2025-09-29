import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler } from "@nestjs/common"
import type { Observable } from "rxjs"
import { tap } from "rxjs/operators"

import type { CacheOptimizationService } from "../services/cache-optimization.service"

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private readonly cacheOptimizationService: CacheOptimizationService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest()
    const response = context.switchToHttp().getResponse()

    const route = request.route?.path || request.url
    const method = request.method

    // Get cache configuration for this route
    const cacheConfig = await this.cacheOptimizationService.getCacheConfiguration(route, method)

    if (!cacheConfig.shouldCache) {
      return next.handle()
    }

    // Check if client has cached version
    const ifNoneMatch = request.headers["if-none-match"]
    const ifModifiedSince = request.headers["if-modified-since"]

    return next.handle().pipe(
      tap((data) => {
        // Generate ETag for response data
        const etag = this.cacheOptimizationService.generateETag(data)
        const lastModified = new Date()

        // Check if client has current version
        const isNotModified = this.cacheOptimizationService.isNotModified(
          ifNoneMatch,
          etag,
          ifModifiedSince,
          lastModified,
        )

        if (isNotModified) {
          response.status(304)
          return
        }

        // Set cache headers
        Object.entries(cacheConfig.headers).forEach(([key, value]) => {
          response.setHeader(key, value)
        })

        // Set ETag and Last-Modified
        response.setHeader("ETag", etag)
        response.setHeader("Last-Modified", lastModified.toUTCString())

        // Set additional PWA-friendly headers
        response.setHeader("Service-Worker-Allowed", "/")
        response.setHeader("X-Content-Type-Options", "nosniff")
      }),
    )
  }
}
