import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ConnectionPoolMonitor, PoolStats } from './connection-pool.monitor';
import { ConnectionPoolManager, CircuitState } from './connection-pool.manager';

@ApiTags('Database Pool')
@Controller('database/pool')
export class ConnectionPoolController {
  constructor(
    private readonly poolMonitor: ConnectionPoolMonitor,
    private readonly poolManager: ConnectionPoolManager,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Check connection pool health' })
  @ApiResponse({
    status: 200,
    description: 'Pool health status',
    content: {
      'application/json': {
        example: {
          healthy: true,
          stats: {
            total: 10,
            idle: 7,
            active: 3,
            waiting: 0,
            maxConnections: 20,
            utilizationPercent: 30,
          },
        },
      },
    },
  })
  async getPoolHealth(): Promise<{ healthy: boolean; stats: PoolStats }> {
    return this.poolMonitor.checkPoolHealth();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get current pool statistics' })
  @ApiResponse({
    status: 200,
    description: 'Current pool stats',
    content: {
      'application/json': {
        example: {
          total: 10,
          idle: 7,
          active: 3,
          waiting: 0,
          maxConnections: 20,
          utilizationPercent: 30,
        },
      },
    },
  })
  async getPoolStats(): Promise<PoolStats> {
    return this.poolMonitor.getPoolStats();
  }

  @Get('stats/recent')
  @ApiOperation({ summary: 'Get recent pool statistics history' })
  @ApiQuery({ name: 'count', required: false, type: Number, description: 'Number of recent snapshots to return (default: 10)', example: 5 })
  @ApiResponse({
    status: 200,
    description: 'Recent pool stats history',
    content: {
      'application/json': {
        example: [
          { total: 10, idle: 8, active: 2, waiting: 0, maxConnections: 20, utilizationPercent: 20, recordedAt: '2024-06-01T11:55:00.000Z' },
          { total: 10, idle: 7, active: 3, waiting: 0, maxConnections: 20, utilizationPercent: 30, recordedAt: '2024-06-01T12:00:00.000Z' },
        ],
      },
    },
  })
  async getRecentStats(@Query('count') count?: number): Promise<PoolStats[]> {
    return this.poolMonitor.getRecentStats(count ? parseInt(count.toString()) : 10);
  }

  @Get('utilization')
  @ApiOperation({ summary: 'Get average pool utilization' })
  @ApiQuery({ name: 'minutes', required: false, type: Number, description: 'Time window in minutes to average over (default: 5)', example: 5 })
  @ApiResponse({
    status: 200,
    description: 'Average utilization percentage over the specified window',
    content: {
      'application/json': {
        example: { averageUtilization: 27.5 },
      },
    },
  })
  async getAverageUtilization(@Query('minutes') minutes?: number) {
    const avgUtilization = this.poolMonitor.getAverageUtilization(
      minutes ? parseInt(minutes.toString()) : 5,
    );
    return { averageUtilization: avgUtilization };
  }

  @Get('circuit-breaker')
  @ApiOperation({ summary: 'Get circuit breaker state' })
  @ApiResponse({
    status: 200,
    description: 'Current circuit breaker state',
    content: {
      'application/json': {
        example: { state: 'CLOSED' },
      },
    },
  })
  async getCircuitBreakerState(): Promise<{ state: CircuitState }> {
    return { state: this.poolManager.getCircuitState() };
  }
}
