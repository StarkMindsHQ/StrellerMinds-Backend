import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseMonitorService } from './database.monitor.service';
import { DynamicPoolSizingService } from './dynamic-pool-sizing.service';

@ApiTags('Database Metrics')
@Controller('database/metrics')
export class DatabaseMetricsController {
  constructor(
    private readonly monitorService: DatabaseMonitorService,
    private readonly poolSizingService: DynamicPoolSizingService,
  ) {}

  @Get('connection')
  @ApiOperation({ summary: 'Check database connection status' })
  @ApiResponse({
    status: 200,
    description: 'Database connection status',
    content: {
      'application/json': {
        example: { connected: true },
      },
    },
  })
  async checkConnection() {
    const isConnected = await this.monitorService.checkConnection();
    return { connected: isConnected };
  }

  @Get('pool-size')
  @ApiOperation({ summary: 'Get recommended pool size' })
  @ApiResponse({
    status: 200,
    description: 'Recommended optimal pool size based on current load',
    content: {
      'application/json': {
        example: {
          recommendedSize: 15,
          currentSize: 10,
          minSize: 5,
          maxSize: 20,
          reason: 'Increased load detected – scaling up recommended',
        },
      },
    },
  })
  async getPoolSize() {
    return this.poolSizingService.calculateOptimalPoolSize();
  }
}
