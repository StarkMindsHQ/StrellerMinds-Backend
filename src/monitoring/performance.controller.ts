import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Post,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../role/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/userRole.enum';

@ApiTags('Performance Monitoring')
@Controller('performance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PerformanceController {
  constructor(private readonly performanceMonitoringService: PerformanceMonitoringService) {}

  @Get('system/summary')
  @ApiOperation({
    summary: 'Get system performance summary',
    description: 'Returns overall system performance metrics and statistics',
  })
  @ApiQuery({
    name: 'timeWindow',
    required: false,
    description: 'Time window in seconds (default: 3600)',
    example: 3600,
  })
  @ApiResponse({
    status: 200,
    description: 'System performance summary retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        timeWindow: { type: 'number', example: 3600 },
        totalRequests: { type: 'number', example: 1500 },
        overallPerformance: {
          type: 'object',
          properties: {
            averageResponseTime: { type: 'number', example: 245.5 },
            medianResponseTime: { type: 'number', example: 180.2 },
            p95ResponseTime: { type: 'number', example: 850.1 },
            p99ResponseTime: { type: 'number', example: 1200.5 },
            overallErrorRate: { type: 'number', example: 0.8 },
            averageMemoryUsage: { type: 'number', example: 65.2 },
            throughput: { type: 'number', example: 125.5 },
          },
        },
        performanceGrade: { type: 'string', example: 'B' },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
          example: ['Consider implementing caching to reduce response times'],
        },
      },
    },
  })
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  getSystemPerformanceSummary(@Query('timeWindow') timeWindow: string = '3600') {
    const timeWindowMs = parseInt(timeWindow) * 1000;
    return this.performanceMonitoringService.getSystemPerformanceSummary(timeWindowMs);
  }

  @Get('endpoint/:endpoint')
  @ApiOperation({
    summary: 'Get endpoint-specific performance statistics',
    description: 'Returns detailed performance metrics for a specific endpoint',
  })
  @ApiQuery({
    name: 'timeWindow',
    required: false,
    description: 'Time window in seconds (default: 3600)',
    example: 3600,
  })
  @ApiResponse({
    status: 200,
    description: 'Endpoint performance statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        endpoint: { type: 'string', example: '/courses' },
        timeWindow: { type: 'number', example: 3600 },
        totalRequests: { type: 'number', example: 450 },
        averageResponseTime: { type: 'number', example: 320.5 },
        medianResponseTime: { type: 'number', example: 280.1 },
        p95ResponseTime: { type: 'number', example: 750.2 },
        p99ResponseTime: { type: 'number', example: 1100.8 },
        errorRate: { type: 'number', example: 1.2 },
        throughput: { type: 'number', example: 0.125 },
        statusCodeDistribution: {
          type: 'object',
          example: { '200': 440, '404': 8, '500': 2 },
        },
      },
    },
  })
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  getEndpointPerformanceStats(
    @Query('endpoint') endpoint: string,
    @Query('timeWindow') timeWindow: string = '3600',
  ) {
    const timeWindowMs = parseInt(timeWindow) * 1000;
    return this.performanceMonitoringService.getEndpointPerformanceStats(endpoint, timeWindowMs);
  }

  @Get('metrics/real-time')
  @ApiOperation({
    summary: 'Get real-time performance metrics',
    description: 'Returns current system performance metrics in real-time',
  })
  @ApiResponse({
    status: 200,
    description: 'Real-time metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        currentLoad: {
          type: 'object',
          properties: {
            memoryUsage: { type: 'number', example: 68.5 },
            cpuUsage: { type: 'number', example: 45.2 },
            activeConnections: { type: 'number', example: 25 },
            requestsPerSecond: { type: 'number', example: 15.8 },
          },
        },
        recentPerformance: {
          type: 'object',
          properties: {
            lastMinuteAvgResponseTime: { type: 'number', example: 285.5 },
            lastMinuteErrorRate: { type: 'number', example: 0.5 },
            lastMinuteThroughput: { type: 'number', example: 18.2 },
          },
        },
      },
    },
  })
  @Roles(UserRole.ADMIN)
  getRealTimeMetrics() {
    // Get last minute performance data
    const oneMinute = 60 * 1000;
    const summary = this.performanceMonitoringService.getSystemPerformanceSummary(oneMinute);

    return {
      timestamp: new Date().toISOString(),
      currentLoad: {
        memoryUsage: this.getCurrentMemoryUsage(),
        cpuUsage: this.getCurrentCpuUsage(),
        activeConnections: 0, // Placeholder - implement based on your connection pool
        requestsPerSecond: summary.overallPerformance?.throughput || 0,
      },
      recentPerformance: {
        lastMinuteAvgResponseTime: summary.overallPerformance?.averageResponseTime || 0,
        lastMinuteErrorRate: summary.overallPerformance?.overallErrorRate || 0,
        lastMinuteThroughput: summary.overallPerformance?.throughput || 0,
      },
    };
  }

  @Get('health/performance')
  @ApiOperation({
    summary: 'Get performance health status',
    description: 'Returns current performance health status and alerts',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance health status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'warning', 'critical'] },
        grade: { type: 'string', example: 'B' },
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', example: 'HIGH_RESPONSE_TIME' },
              severity: { type: 'string', enum: ['warning', 'critical'] },
              message: { type: 'string', example: 'Average response time exceeds threshold' },
              value: { type: 'number', example: 1250.5 },
              threshold: { type: 'number', example: 1000 },
            },
          },
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  getPerformanceHealth() {
    const summary = this.performanceMonitoringService.getSystemPerformanceSummary();

    if (!summary.overallPerformance) {
      return {
        status: 'unknown',
        message: 'Insufficient performance data',
        grade: 'N/A',
        issues: [],
        recommendations: ['Allow system to collect performance data'],
      };
    }

    const issues = [];
    let status = 'healthy';

    // Check response time
    if (summary.overallPerformance.averageResponseTime > 2000) {
      status = 'critical';
      issues.push({
        type: 'HIGH_RESPONSE_TIME',
        severity: 'critical',
        message: 'Average response time is critically high',
        value: summary.overallPerformance.averageResponseTime,
        threshold: 2000,
      });
    } else if (summary.overallPerformance.averageResponseTime > 1000) {
      status = status === 'healthy' ? 'warning' : status;
      issues.push({
        type: 'HIGH_RESPONSE_TIME',
        severity: 'warning',
        message: 'Average response time exceeds warning threshold',
        value: summary.overallPerformance.averageResponseTime,
        threshold: 1000,
      });
    }

    // Check error rate
    if (summary.overallPerformance.overallErrorRate > 5) {
      status = 'critical';
      issues.push({
        type: 'HIGH_ERROR_RATE',
        severity: 'critical',
        message: 'Error rate is critically high',
        value: summary.overallPerformance.overallErrorRate,
        threshold: 5,
      });
    } else if (summary.overallPerformance.overallErrorRate > 1) {
      status = status === 'healthy' ? 'warning' : status;
      issues.push({
        type: 'HIGH_ERROR_RATE',
        severity: 'warning',
        message: 'Error rate exceeds warning threshold',
        value: summary.overallPerformance.overallErrorRate,
        threshold: 1,
      });
    }

    // Check memory usage
    const memoryUsage = this.getCurrentMemoryUsage();
    if (memoryUsage > 85) {
      status = 'critical';
      issues.push({
        type: 'HIGH_MEMORY_USAGE',
        severity: 'critical',
        message: 'Memory usage is critically high',
        value: memoryUsage,
        threshold: 85,
      });
    } else if (memoryUsage > 70) {
      status = status === 'healthy' ? 'warning' : status;
      issues.push({
        type: 'HIGH_MEMORY_USAGE',
        severity: 'warning',
        message: 'Memory usage exceeds warning threshold',
        value: memoryUsage,
        threshold: 70,
      });
    }

    return {
      status,
      grade: summary.performanceGrade,
      issues,
      recommendations: summary.recommendations,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('baseline/create')
  @ApiOperation({
    summary: 'Create performance baseline',
    description: 'Creates a new performance baseline for comparison',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Production Baseline v1.0' },
        description: { type: 'string', example: 'Baseline after optimization changes' },
        timeWindow: { type: 'number', example: 3600, description: 'Time window in seconds' },
      },
      required: ['name'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Performance baseline created successfully',
  })
  @Roles(UserRole.ADMIN)
  createPerformanceBaseline(
    @Body() createBaselineDto: { name: string; description?: string; timeWindow?: number },
  ) {
    const timeWindow = (createBaselineDto.timeWindow || 3600) * 1000;
    const summary = this.performanceMonitoringService.getSystemPerformanceSummary(timeWindow);

    // In a real implementation, you would save this to a database
    const baseline = {
      id: Date.now().toString(),
      name: createBaselineDto.name,
      description: createBaselineDto.description,
      createdAt: new Date().toISOString(),
      metrics: summary,
    };

    return {
      message: 'Performance baseline created successfully',
      baseline,
    };
  }

  // Helper methods
  private getCurrentMemoryUsage(): number {
    const usage = process.memoryUsage();
    return (usage.heapUsed / usage.heapTotal) * 100;
  }

  private getCurrentCpuUsage(): number {
    const usage = process.cpuUsage();
    return (usage.user + usage.system) / 1000000;
  }
}
