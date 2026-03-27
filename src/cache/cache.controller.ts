import {
  Controller,
  Get,
  Post,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { Roles } from '../auth/guards/auth.guard';
import { UserRole } from '../auth/entities/user.entity';
import { CacheService } from './cache.service';
import { CacheMetricsService, CacheStats } from './cache.metrics';
import { CacheWarmingService } from './cache-warming.service';

@ApiTags('Cache')
@Controller('cache')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CacheController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly metrics: CacheMetricsService,
    private readonly warmingService: CacheWarmingService,
  ) {}

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get cache performance statistics' })
  @ApiResponse({ status: 200, description: 'Cache statistics retrieved successfully' })
  async getStats(): Promise<{ success: boolean; data: CacheStats }> {
    const stats = await this.cacheService.getStats();
    return { success: true, data: stats };
  }

  @Get('top-keys')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get top performing cache keys' })
  @ApiResponse({ status: 200, description: 'Top cache keys retrieved successfully' })
  async getTopKeys(@Query('limit') limit = 10) {
    const topKeys = await this.metrics.getTopKeys(Number(limit));
    return { success: true, data: topKeys };
  }

  @Post('warm')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Warm cache for specific data types' })
  @ApiResponse({ status: 200, description: 'Cache warming initiated successfully' })
  async warmCache(@Body() body: { dataType: string; identifiers: string[] }) {
    await this.warmingService.warmSpecificData(body.dataType, body.identifiers);
    return { success: true, message: 'Cache warming initiated' };
  }

  @Post('warm-all')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Warm all critical cache data' })
  @ApiResponse({ status: 200, description: 'Full cache warming initiated successfully' })
  async warmAllCache() {
    await this.warmingService.warmCriticalData();
    return { success: true, message: 'Full cache warming initiated' };
  }

  @Delete('invalidate')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate cache by key pattern' })
  @ApiResponse({ status: 200, description: 'Cache invalidation completed successfully' })
  async invalidateCache(@Body() body: { pattern?: string; tag?: string; key?: string }) {
    if (body.key) {
      await this.cacheService.invalidate(body.key);
    } else if (body.tag) {
      await this.cacheService.invalidateByTag(body.tag);
    } else if (body.pattern) {
      await this.cacheService.invalidatePattern(body.pattern);
    } else {
      throw new Error('Either key, pattern, or tag must be provided');
    }

    return { success: true, message: 'Cache invalidation completed' };
  }

  @Delete('reset-stats')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset cache statistics' })
  @ApiResponse({ status: 200, description: 'Cache statistics reset successfully' })
  async resetStats() {
    await this.cacheService.resetStats();
    return { success: true, message: 'Cache statistics reset' };
  }

  @Get('health')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Check cache system health' })
  @ApiResponse({ status: 200, description: 'Cache health status retrieved successfully' })
  async getHealth() {
    const stats = await this.cacheService.getStats();
    const health = {
      status: 'healthy',
      hitRate: stats.global.hitRate,
      totalRequests: stats.global.totalRequests,
      memoryUsage: stats.global.memoryUsage,
      keyCount: stats.global.keyCount,
      recommendations: this.generateRecommendations(stats),
    };

    if (stats.global.hitRate < 50) {
      health.status = 'degraded';
    }
    if (stats.global.hitRate < 20) {
      health.status = 'unhealthy';
    }

    return { success: true, data: health };
  }

  private generateRecommendations(stats: CacheStats): string[] {
    const recommendations: string[] = [];

    if (stats.global.hitRate < 50) {
      recommendations.push('Consider increasing cache TTL for frequently accessed data');
      recommendations.push('Review cache key patterns for better hit rates');
    }

    if (stats.global.memoryUsage > 1024 * 1024 * 1024) { // 1GB
      recommendations.push('Memory usage is high, consider cache eviction policies');
    }

    if (stats.global.totalRequests === 0) {
      recommendations.push('Cache warming may be needed for initial population');
    }

    return recommendations;
  }
}
