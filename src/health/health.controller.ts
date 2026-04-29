import { Controller, Get } from '@nestjs/common';
import { HealthCheck } from '@nestjs/terminus';
import { HealthService } from './health.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Detailed health check', description: 'Returns the health status of all system components including database, cache, and external services.' })
  @ApiResponse({
    status: 200,
    description: 'All systems healthy',
    content: {
      'application/json': {
        example: {
          status: 'ok',
          info: {
            database: { status: 'up' },
            redis: { status: 'up' },
            memory: { status: 'up', rss: 150000000 },
          },
          error: {},
          details: {
            database: { status: 'up' },
            redis: { status: 'up' },
            memory: { status: 'up', rss: 150000000 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'One or more services are unavailable',
    content: {
      'application/json': {
        example: {
          status: 'error',
          info: { redis: { status: 'up' } },
          error: { database: { status: 'down', message: 'Connection refused' } },
          details: {
            database: { status: 'down', message: 'Connection refused' },
            redis: { status: 'up' },
          },
        },
      },
    },
  })
  async check() {
    return this.healthService.checkFullHealth();
  }

  @Get('live')
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe', description: 'Kubernetes/container liveness probe. Returns 200 if the process is alive.' })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
    content: {
      'application/json': {
        example: { status: 'ok', info: { alive: { status: 'up' } }, error: {}, details: { alive: { status: 'up' } } },
      },
    },
  })
  async liveness() {
    return this.healthService.checkLiveness();
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe', description: 'Kubernetes/container readiness probe. Returns 200 only when the application is ready to accept traffic.' })
  @ApiResponse({
    status: 200,
    description: 'Application is ready to accept traffic',
    content: {
      'application/json': {
        example: {
          status: 'ok',
          info: { database: { status: 'up' }, redis: { status: 'up' } },
          error: {},
          details: { database: { status: 'up' }, redis: { status: 'up' } },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready',
    content: {
      'application/json': {
        example: {
          status: 'error',
          info: {},
          error: { database: { status: 'down', message: 'Connection refused' } },
          details: { database: { status: 'down', message: 'Connection refused' } },
        },
      },
    },
  })
  async readiness() {
    return this.healthService.checkReadiness();
  }
}
