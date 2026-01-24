import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheck } from '@nestjs/terminus';
import { SkipRateLimit } from '../common/decorators/rate-limit.decorator';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @SkipRateLimit()
  @HealthCheck()
  @ApiOperation({ 
    summary: 'Comprehensive health check endpoint',
    description: 'Returns full health status with system metrics'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy with detailed metrics' 
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Service is unhealthy' 
  })
  async check() {
    return this.healthService.check();
  }

  @Get('ready')
  @SkipRateLimit()
  @ApiOperation({ 
    summary: 'Readiness check endpoint',
    description: 'Checks if service is ready to accept traffic'
  })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async ready() {
    return this.healthService.readiness();
  }

  @Get('live')
  @SkipRateLimit()
  @ApiOperation({ 
    summary: 'Liveness check endpoint',
    description: 'Checks if service is alive (basic check)'
  })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  @ApiResponse({ status: 503, description: 'Service is not alive' })
  async live() {
    return this.healthService.liveness();
  }

  @Get('metrics')
  @SkipRateLimit()
  @ApiOperation({ 
    summary: 'Prometheus metrics endpoint',
    description: 'Returns metrics in Prometheus format'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Metrics in Prometheus format',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          example: '# HELP http_requests_total Total HTTP requests\n# TYPE http_requests_total counter'
        }
      }
    }
  })
  async getMetrics() {
    return this.healthService.getMetrics();
  }

  @Get('detailed')
  @SkipRateLimit()
  @ApiOperation({ 
    summary: 'Detailed health metrics',
    description: 'Returns comprehensive health and performance metrics'
  })
  @ApiResponse({ status: 200, description: 'Detailed health metrics' })
  async detailed() {
    return this.healthService.getDetailedHealth();
  }
}
