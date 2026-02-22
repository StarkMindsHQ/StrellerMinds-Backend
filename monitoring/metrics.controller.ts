import { Controller, Get } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly cacheService: CacheService) {}

  @Get()
  getMetrics() {
    return {
      cache: this.cacheService.getStats(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}