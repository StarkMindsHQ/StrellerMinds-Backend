import { Plugin } from "@nestjs/apollo"
import type { ApolloServerPlugin, GraphQLRequestListener } from "apollo-server-plugin-base"
import { Logger } from "@nestjs/common"

@Plugin()
export class GraphQLCachePlugin implements ApolloServerPlugin {
  private readonly logger = new Logger(GraphQLCachePlugin.name)
  private readonly cache = new Map<string, { data: any; timestamp: number }>()
  private readonly TTL = 5 * 60 * 1000 // 5 minutes

  requestDidStart(): GraphQLRequestListener {
    return {
      willSendResponse({ request, response }) {
        // Simple caching logic for GET queries
        if (request.http?.method === "GET" && !response.errors) {
          const cacheKey = this.generateCacheKey(request)
          this.cache.set(cacheKey, {
            data: response.data,
            timestamp: Date.now(),
          })

          // Clean up expired entries
          this.cleanupExpiredEntries()
        }
      },
    }
  }

  private generateCacheKey(request: any): string {
    return `${request.operationName || "anonymous"}_${JSON.stringify(request.variables || {})}`
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.TTL) {
        this.cache.delete(key)
      }
    }
  }
}
