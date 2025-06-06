import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CacheManagerService } from '../services/cache-manager.service';
import { CacheService } from '../services/cache.service';

@Controller('admin/cache')
export class CacheManagementController {
  constructor(
    private cacheManager: CacheManagerService,
    private cacheService: CacheService,
  ) {}

  @Get('stats')
  async getCacheStats() {
    return this.cacheManager.getCacheStats();
  }

  @Get('check')
  async checkCacheKey(@Query('key') key: string) {
    const exists = await this.cacheService.exists(key);
    const ttl = exists ? await this.cacheService.ttl(key) : -1;
    
    return {
      key,
      exists,
      ttl,
    };
  }

  @Post('invalidate')
  async invalidateCache(@Body() body: { patterns?: string[]; tags?: string[] }) {
    await this.cacheManager.invalidateCache(body.patterns, body.tags);
    return { message: 'Cache invalidated successfully' };
  }

  @Delete('clear')
  async clearAllCache() {
    await this.cacheService.clear();
    return { message: 'All cache cleared successfully' };
  }

  @Post('warm-up')
  async warmUpCache(@Body() endpoints: Array<{ key: string; data: any; ttl?: number }>) {
    await this.cacheManager.warmUpCache(endpoints);
    return { message: `Cache warmed up with ${endpoints.length} entries` };
  }
}
