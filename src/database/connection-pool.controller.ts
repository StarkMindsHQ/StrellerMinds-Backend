import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ConnectionPoolMonitor } from './connection-pool.monitor';
import { ConnectionPoolManager } from './connection-pool.manager';

@ApiTags('Database Pool')
@Controller('database/pool')
export class ConnectionPoolController {
  constructor(
    private readonly poolMonitor: ConnectionPoolMonitor,
    private readonly poolManager: ConnectionPoolManager,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Check connection pool health' })
  @ApiResponse({ status: 200, description: 'Pool health status' })
  async getPoolHealth() {
    return this.poolMonitor.checkPoolHealth();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get current pool statistics' })
  @ApiResponse({ status: 200, description: 'Current pool stats' })
  async getPoolStats() {
    return this.poolMonitor.getPoolStats();
  }

  @Get('stats/recent')
  @ApiOperation({ summary: 'Get recent pool statistics history' })
  @ApiQuery({ name: 'count', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Recent pool stats' })
  async getRecentStats(@Query('count') count?: number) {
    return this.poolMonitor.getRecentStats(count ? parseInt(count.toString()) : 10);
  }

  @Get('utilization')
  @ApiOperation({ summary: 'Get average pool utilization' })
  @ApiQuery({ name: 'minutes', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Average utilization percentage' })
  async getAverageUtilization(@Query('minutes') minutes?: number) {
    const avgUtilization = this.poolMonitor.getAverageUtilization(
      minutes ? parseInt(minutes.toString()) : 5,
    );
    return { averageUtilization: avgUtilization };
  }

  @Get('circuit-breaker')
  @ApiOperation({ summary: 'Get circuit breaker state' })
  @ApiResponse({ status: 200, description: 'Circuit breaker state' })
  async getCircuitBreakerState() {
    return { state: this.poolManager.getCircuitState() };
  }
}
